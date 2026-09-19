import { buildAuditEvent } from "@/features/audit/event-factory";
import { auditRepository } from "@/features/audit/repository";
import { ensureStudentRoutineDirectory, persistRoutineProvisioning } from "@/features/routines/storage";

import { decryptPayload, type EncryptionKey } from "./crypto";
import { sendOutboxEmail } from "./email-adapter";
import { OutboxRepository, type OutboxStateTransaction, type OutboxTransaction, type SettlementResult } from "./repository";

type EmailPayload = { to: string; activationUrl: string; expiresAt: string };
type ProvisionPayload = { studentProfileId: string };
type Dependencies = {
  repository?: OutboxRepository; keys: EncryptionKey | Record<string, string>;
  email?: (input: EmailPayload & { idempotencyKey: string }) => Promise<unknown>;
  provision?: (studentProfileId: string) => Promise<void>; audit?: (event: unknown, transaction: OutboxTransaction) => Promise<unknown>;
};
const safeError = (error: unknown) => error instanceof Error && /config|invalid|unsupported|expired/i.test(error.message) ? "PERMANENT" : "TRANSIENT";

export class OutboxWorker {
  private readonly repository; private readonly keys; private readonly email; private readonly provision; private readonly audit;
  constructor(dependencies: Dependencies) {
    this.repository = dependencies.repository ?? new OutboxRepository(); this.keys = dependencies.keys;
    this.email = dependencies.email ?? sendOutboxEmail;
    this.provision = dependencies.provision ?? ensureStudentRoutineDirectory;
    this.audit = dependencies.audit ?? ((event, transaction) => auditRepository.append(event as any, transaction as any));
  }
  async drain() {
    let claimed = 0;
    for (;;) {
      const job: any = await this.repository.claim();
      if (!job) return { claimed };
      claimed++;
      try {
        if (job.messageType === "EMAIL") {
          const payload = decryptPayload<EmailPayload>(job.payloadEncrypted, this.keys);
          if (new Date(payload.expiresAt).getTime() <= Date.now()) throw new Error("EXPIRED");
          await this.email({ ...payload, idempotencyKey: job.idempotencyKey });
        }
        else if (job.messageType === "ROUTINE_PROVISION") await this.provision(decryptPayload<ProvisionPayload>(job.payloadEncrypted, this.keys).studentProfileId);
        else throw new Error("unsupported message");
        await this.outcome(job, "COMPLETED", (transaction) => this.repository.complete(job.id, job.fencingToken, transaction));
      } catch (error) {
        const category = job.messageType === "EMAIL" || job.messageType === "ROUTINE_PROVISION" ? safeError(error) : "UNSUPPORTED";
        const settle = category === "PERMANENT" ? (transaction: OutboxStateTransaction) => this.repository.fail(job.id, job.fencingToken, category, "Delivery failed", transaction, new Date(), job.messageType === "EMAIL") : (transaction: OutboxStateTransaction) => this.repository.retry(job.id, job.fencingToken, category, "Delivery failed", transaction);
        await this.outcome(job, "FAILED", settle);
      }
    }
  }
  private async outcome(job: any, requestedStatus: string, settle: (transaction: OutboxStateTransaction) => Promise<SettlementResult>) {
    await this.repository.inTransaction(async (transaction) => {
      const result = await settle(transaction);
      if (result === "STALE") return;
      const deliveryStatus = result === "COMPLETED" ? requestedStatus : result;
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
