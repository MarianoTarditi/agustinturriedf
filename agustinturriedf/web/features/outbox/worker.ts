import { createHash, timingSafeEqual } from "node:crypto";

import { buildAuditEvent } from "@/features/audit/event-factory";
import { auditRepository } from "@/features/audit/repository";
import { invitationRepository, type InvitationRepository } from "@/features/invitations/repository";
import { ensureStudentRoutineDirectory, persistRoutineProvisioning } from "@/features/routines/storage";

import { decryptPayload, type EncryptionKey } from "./crypto";
import { sendOutboxEmail } from "./email-adapter";
import { OutboxRepository, type OutboxStateTransaction, type OutboxTransaction, type SettlementResult } from "./repository";

type EmailPayload = { to: string; activationUrl: string; expiresAt: string; resourceType: string };
type ProvisionPayload = { studentProfileId: string };
type InvitationDeliveryContext = { tokenHash: string };
type ProcessingResult =
  | { kind: "COMPLETED"; invitation?: InvitationDeliveryContext }
  | { kind: "SUPPRESSED" }
  | { kind: "FAILED"; error: unknown; invitation?: InvitationDeliveryContext };
type Dependencies = {
  repository?: OutboxRepository; keys: EncryptionKey | Record<string, string>;
  email?: (input: EmailPayload & { idempotencyKey: string }) => Promise<unknown>;
  provision?: (studentProfileId: string) => Promise<void>; audit?: (event: unknown, transaction: OutboxTransaction) => Promise<unknown>;
  invitations?: Pick<InvitationRepository, "findDeliveryState" | "projectDeliveryStatusIfCurrent">;
  now?: () => Date;
};
const safeError = (error: unknown) => error instanceof Error && /config|invalid|unsupported|expired/i.test(error.message) ? "PERMANENT" : "TRANSIENT";
const invitationTokenHash = (activationUrl: string) => {
  try {
    const token = new URL(activationUrl).searchParams.get("token");
    return token ? createHash("sha256").update(token).digest("hex") : null;
  } catch {
    return null;
  }
};
const hashesMatch = (left: string, right: string) => {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
};

export class OutboxWorker {
  private readonly repository; private readonly keys; private readonly email; private readonly provision; private readonly audit; private readonly invitations; private readonly now;
  constructor(dependencies: Dependencies) {
    this.repository = dependencies.repository ?? new OutboxRepository(); this.keys = dependencies.keys;
    this.email = dependencies.email ?? sendOutboxEmail;
    this.provision = dependencies.provision ?? ensureStudentRoutineDirectory;
    this.audit = dependencies.audit ?? ((event, transaction) => auditRepository.append(event as any, transaction as any));
    this.invitations = dependencies.invitations ?? invitationRepository;
    this.now = dependencies.now ?? (() => new Date());
  }
  async drain() {
    let claimed = 0;
    for (;;) {
      const job: any = await this.repository.claim(this.now());
      if (!job) return { claimed };
      claimed++;
      const result = await this.process(job);
      if (result.kind === "COMPLETED") {
        await this.outcome(job, "COMPLETED", (transaction) => this.repository.complete(job.id, job.fencingToken, transaction, this.now()), result.invitation && { ...result.invitation, deliveryStatus: "SENT" });
        continue;
      }
      if (result.kind === "SUPPRESSED") {
        await this.outcome(job, "FAILED", (transaction) => this.repository.fail(job.id, job.fencingToken, "INVITATION_INELIGIBLE", "Invitation is no longer eligible for delivery", transaction, this.now(), true));
        continue;
      }
      const category = job.messageType === "EMAIL" || job.messageType === "ROUTINE_PROVISION" ? safeError(result.error) : "UNSUPPORTED";
      const settle = category === "PERMANENT"
        ? (transaction: OutboxStateTransaction) => this.repository.fail(job.id, job.fencingToken, category, "Delivery failed", transaction, this.now(), job.messageType === "EMAIL")
        : (transaction: OutboxStateTransaction) => this.repository.retry(job.id, job.fencingToken, category, "Delivery failed", transaction, this.now());
      await this.outcome(job, "FAILED", settle, result.invitation && { ...result.invitation, deliveryStatus: "FAILED" });
    }
  }
  private async process(job: any): Promise<ProcessingResult> {
    if (job.messageType === "EMAIL") return this.processEmail(job);
    if (job.messageType === "ROUTINE_PROVISION") {
      try {
        await this.provision(decryptPayload<ProvisionPayload>(job.payloadEncrypted, this.keys).studentProfileId);
        return { kind: "COMPLETED" };
      } catch (error) {
        return { kind: "FAILED", error };
      }
    }
    return { kind: "FAILED", error: new Error("unsupported message") };
  }
  private async processEmail(job: any): Promise<ProcessingResult> {
    let payload: EmailPayload;
    try {
      payload = decryptPayload<EmailPayload>(job.payloadEncrypted, this.keys);
    } catch (error) {
      return { kind: "FAILED", error };
    }
    const now = this.now();
    const payloadExpiresAt = new Date(payload.expiresAt);
    if (job.resourceType !== "INVITATION") {
      if (Number.isNaN(payloadExpiresAt.getTime()) || payloadExpiresAt.getTime() <= now.getTime()) return { kind: "FAILED", error: new Error("EXPIRED") };
      try {
        await this.email({ ...payload, resourceType: job.resourceType, idempotencyKey: job.idempotencyKey });
        return { kind: "COMPLETED" };
      } catch (error) {
        return { kind: "FAILED", error };
      }
    }

    const tokenHash = invitationTokenHash(payload.activationUrl);
    const invitation = await this.invitations.findDeliveryState(job.resourceId);
    if (
      !invitation ||
      !["PENDING", "SENT"].includes(invitation.status ?? "") ||
      !invitation.tokenHash ||
      !invitation.expiresAt ||
      invitation.expiresAt.getTime() <= now.getTime() ||
      Number.isNaN(payloadExpiresAt.getTime()) ||
      payloadExpiresAt.getTime() <= now.getTime() ||
      !tokenHash ||
      !hashesMatch(tokenHash, invitation.tokenHash)
    ) return { kind: "SUPPRESSED" };

    const context = { tokenHash };
    try {
      await this.email({ ...payload, resourceType: job.resourceType, idempotencyKey: job.idempotencyKey });
      return { kind: "COMPLETED", invitation: context };
    } catch (error) {
      return { kind: "FAILED", error, invitation: context };
    }
  }
  private async outcome(
    job: any,
    requestedStatus: string,
    settle: (transaction: OutboxStateTransaction) => Promise<SettlementResult>,
    projection?: InvitationDeliveryContext & { deliveryStatus: "SENT" | "FAILED" }
  ) {
    await this.repository.inTransaction(async (transaction) => {
      const result = await settle(transaction);
      if (result === "STALE") return;
      const deliveryStatus = result === "COMPLETED" ? requestedStatus : result;
      if (projection && (result === "COMPLETED" || result === "FAILED")) {
        const projected = await this.invitations.projectDeliveryStatusIfCurrent({
          invitationId: job.resourceId,
          tokenHash: projection.tokenHash,
          now: this.now(),
          deliveryStatus: projection.deliveryStatus,
        }, transaction as any);
        if (!projected) throw new Error("Invitation delivery projection is no longer current");
      }
      if (job.messageType === "ROUTINE_PROVISION") {
        const studentProfileId = decryptPayload<ProvisionPayload>(job.payloadEncrypted, this.keys).studentProfileId;
        if (result === "COMPLETED") await persistRoutineProvisioning(studentProfileId, "READY", transaction);
        if (result === "FAILED") await persistRoutineProvisioning(studentProfileId, "FAILED", transaction);
      }
      await this.audit(buildAuditEvent({ eventType: `OUTBOX_${deliveryStatus}`, actor: { type: "SYSTEM" }, summary: { deliveryStatus, resourceType: job.resourceType, resourceRef: job.resourceId } }), transaction);
    });
  }
}
export const createProductionOutboxWorker = () => new OutboxWorker({ keys: { id: process.env.OUTBOX_ENCRYPTION_KEY_ID ?? "current", value: process.env.OUTBOX_ENCRYPTION_KEY ?? "" } });
