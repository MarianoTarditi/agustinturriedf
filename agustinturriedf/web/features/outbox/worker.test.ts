import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { encryptPayload } from "./crypto";
import { OutboxWorker } from "./worker";

const key = { id: "test", value: Buffer.alloc(32, 9).toString("base64url") };
const now = new Date("2026-09-27T12:00:00.000Z");
const rawToken = "current-invitation-token";
const tokenHash = createHash("sha256").update(rawToken).digest("hex");
const message = (overrides: Record<string, unknown> = {}) => ({
  id: "job-1",
  messageType: "EMAIL",
  resourceType: "INVITATION",
  resourceId: "invite-1",
  idempotencyKey: "invite:1",
  payloadEncrypted: encryptPayload({
    to: "student@example.com",
    activationUrl: `http://localhost:3010/activation?token=${rawToken}`,
    expiresAt: "2026-09-28T12:00:00.000Z",
  }, key),
  fencingToken: "fence-1",
  attempts: 1,
  ...overrides,
});
const transaction = () => ({
  outboxMessage: { findFirst: vi.fn(), updateMany: vi.fn() },
  invitation: { findUnique: vi.fn(), updateMany: vi.fn() },
  studentProfile: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  auditEvent: { create: vi.fn() },
});
const repository = (job: Record<string, unknown> | null, results: { complete?: string; retry?: string; fail?: string } = {}) => {
  const transactions: ReturnType<typeof transaction>[] = [];
  return {
    claim: vi.fn().mockResolvedValueOnce(job).mockResolvedValue(null),
    transactions,
    inTransaction: vi.fn((operation) => { const tx = transaction(); transactions.push(tx); return operation(tx); }),
    complete: vi.fn().mockResolvedValue(results.complete ?? "COMPLETED"),
    retry: vi.fn().mockResolvedValue(results.retry ?? "RETRY_SCHEDULED"),
    fail: vi.fn().mockResolvedValue(results.fail ?? "FAILED"),
  };
};
const invitations = (state: Record<string, unknown> | null = {
  status: "PENDING",
  tokenHash,
  expiresAt: new Date("2026-09-28T12:00:00.000Z"),
}) => ({
  findDeliveryState: vi.fn().mockResolvedValue(state),
  projectDeliveryStatusIfCurrent: vi.fn().mockResolvedValue(true),
});
const worker = (input: {
  job?: Record<string, unknown>;
  results?: { complete?: string; retry?: string; fail?: string };
  invitationState?: Record<string, unknown> | null;
  email?: ReturnType<typeof vi.fn>;
  audit?: ReturnType<typeof vi.fn>;
} = {}) => {
  const outbox = repository(input.job ?? message(), input.results);
  const invitationStore = invitations(input.invitationState === undefined ? undefined : input.invitationState);
  const email = input.email ?? vi.fn();
  const audit = input.audit ?? vi.fn();
  return {
    outbox,
    invitationStore,
    email,
    audit,
    instance: new OutboxWorker({ repository: outbox as any, invitations: invitationStore as any, keys: key, email: email as any, provision: vi.fn(), audit: audit as any, now: () => now }),
  };
};

describe("outbox worker", () => {
  it("delivers an active invitation and settles its delivery projection in the same transaction", async () => {
    const harness = worker();

    await harness.instance.drain();

    expect(harness.email).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: "invite:1", resourceType: "INVITATION" }));
    expect(harness.outbox.complete).toHaveBeenCalledWith("job-1", "fence-1", expect.anything(), now);
    expect(harness.invitationStore.projectDeliveryStatusIfCurrent).toHaveBeenCalledWith({
      invitationId: "invite-1", tokenHash, now, deliveryStatus: "SENT",
    }, harness.outbox.transactions[0]);
    expect(harness.audit).toHaveBeenCalledWith(expect.objectContaining({ summary: expect.objectContaining({ deliveryStatus: "COMPLETED" }) }), harness.outbox.transactions[0]);
  });

  it.each([
    ["missing", null],
    ["revoked", { status: "REVOKED", tokenHash: null, expiresAt: new Date("2026-09-28T12:00:00.000Z") }],
    ["consumed", { status: "CONSUMED", tokenHash: null, expiresAt: new Date("2026-09-28T12:00:00.000Z") }],
    ["expired", { status: "PENDING", tokenHash, expiresAt: new Date("2026-09-27T11:59:59.000Z") }],
    ["tokenless", { status: "PENDING", tokenHash: null, expiresAt: new Date("2026-09-28T12:00:00.000Z") }],
    ["superseded", { status: "PENDING", tokenHash: "0".repeat(64), expiresAt: new Date("2026-09-28T12:00:00.000Z") }],
  ])("suppresses a %s invitation without calling the provider or changing delivery status", async (_label, invitationState) => {
    const harness = worker({ invitationState });

    await harness.instance.drain();

    expect(harness.email).not.toHaveBeenCalled();
    expect(harness.outbox.fail).toHaveBeenCalledWith(
      "job-1", "fence-1", "INVITATION_INELIGIBLE", "Invitation is no longer eligible for delivery", expect.anything(), now, true
    );
    expect(harness.invitationStore.projectDeliveryStatusIfCurrent).not.toHaveBeenCalled();
  });

  it("suppresses an expired payload even when the persisted invitation remains active", async () => {
    const harness = worker({ job: message({ payloadEncrypted: encryptPayload({
      to: "student@example.com",
      activationUrl: `http://localhost:3010/activation?token=${rawToken}`,
      expiresAt: "2026-09-27T12:00:00.000Z",
    }, key) }) });

    await harness.instance.drain();

    expect(harness.email).not.toHaveBeenCalled();
    expect(harness.outbox.fail).toHaveBeenCalledWith(expect.any(String), expect.any(String), "INVITATION_INELIGIBLE", expect.any(String), expect.anything(), now, true);
  });

  it("keeps invitation delivery pending when a transient provider failure is retryable", async () => {
    const harness = worker({ email: vi.fn().mockRejectedValue(new Error("temporary provider failure")) });

    await harness.instance.drain();

    expect(harness.outbox.retry).toHaveBeenCalled();
    expect(harness.invitationStore.projectDeliveryStatusIfCurrent).not.toHaveBeenCalled();
  });

  it.each([
    ["permanent configuration failure", new Error("EMAIL_CONFIG_MISSING"), { fail: "FAILED" }],
    ["exhausted transient failure", new Error("temporary provider failure"), { retry: "FAILED" }],
  ])("projects FAILED for a current invitation after %s", async (_label, error, results) => {
    const harness = worker({ email: vi.fn().mockRejectedValue(error), results });

    await harness.instance.drain();

    expect(harness.invitationStore.projectDeliveryStatusIfCurrent).toHaveBeenCalledWith({
      invitationId: "invite-1", tokenHash, now, deliveryStatus: "FAILED",
    }, expect.anything());
  });

  it("does not project or audit when a stale fence loses completion", async () => {
    const harness = worker({ results: { complete: "STALE" } });

    await harness.instance.drain();

    expect(harness.email).toHaveBeenCalledOnce();
    expect(harness.invitationStore.projectDeliveryStatusIfCurrent).not.toHaveBeenCalled();
    expect(harness.audit).not.toHaveBeenCalled();
  });

  it("rejects unsupported work safely without decrypting it", async () => {
    const harness = worker({ job: message({ messageType: "OTHER", payloadEncrypted: "not-an-envelope" }), results: { retry: "STALE" } });

    await harness.instance.drain();

    expect(harness.email).not.toHaveBeenCalled();
    expect(harness.outbox.retry).toHaveBeenCalledWith("job-1", "fence-1", "UNSUPPORTED", expect.any(String), expect.anything(), now);
    expect(harness.audit).not.toHaveBeenCalled();
  });

  it.each([["COMPLETED", "READY"], ["RETRY_SCHEDULED", undefined], ["FAILED", "FAILED"]])("preserves routine provisioning projection after an applied %s outcome", async (result, provisioningStatus) => {
    const job = message({ messageType: "ROUTINE_PROVISION", resourceType: "STUDENT_PROFILE", payloadEncrypted: encryptPayload({ studentProfileId: "student-1" }, key) });
    const outbox = repository(job, { complete: result, retry: result });
    const audit = vi.fn();
    const provision = result === "COMPLETED" ? vi.fn() : vi.fn().mockRejectedValue(new Error("temporary"));

    await new OutboxWorker({ repository: outbox as any, invitations: invitations() as any, keys: key, email: vi.fn(), provision, audit, now: () => now }).drain();

    const tx = outbox.transactions[0];
    if (provisioningStatus) expect(tx.studentProfile.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { provisioningStatus } }));
    else expect(tx.studentProfile.updateMany).not.toHaveBeenCalled();
  });
});
