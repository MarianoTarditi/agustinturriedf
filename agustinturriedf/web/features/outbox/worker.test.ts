import { describe, expect, it, vi } from "vitest";

import { encryptPayload } from "./crypto";
import { OutboxWorker } from "./worker";

const key = { id: "test", value: Buffer.alloc(32, 9).toString("base64url") };
const message = (overrides: Record<string, unknown> = {}) => ({
  id: "job-1", messageType: "EMAIL", resourceType: "INVITATION", resourceId: "invite-1", idempotencyKey: "invite:1",
  payloadEncrypted: encryptPayload({ to: "student@example.com", subject: "Welcome", html: "<p>Welcome</p>" }, key), fencingToken: "fence-1", attempts: 1, ...overrides,
});
const transaction = () => ({
  outboxMessage: { findFirst: vi.fn(), updateMany: vi.fn() },
  studentProfile: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  auditEvent: { create: vi.fn() },
});
const repository = (job: Record<string, unknown> | null, result: string) => {
  const transactions: ReturnType<typeof transaction>[] = [];
  return {
  claim: vi.fn().mockResolvedValueOnce(job).mockResolvedValue(null),
  transactions,
  inTransaction: vi.fn((operation) => { const tx = transaction(); transactions.push(tx); return operation(tx); }),
  complete: vi.fn().mockResolvedValue(result),
  retry: vi.fn().mockResolvedValue(result),
  fail: vi.fn(),
  };
};

describe("outbox worker", () => {
  it("claims once before decrypting and sends EMAIL through the injected production adapter with its idempotency key", async () => {
    const claimed = message();
    const outbox = repository(claimed, "COMPLETED");
    const email = vi.fn();
    const audit = vi.fn();
    const worker = new OutboxWorker({ repository: outbox as any, keys: key, email, provision: vi.fn(), audit });
    await Promise.all([worker.drain(), worker.drain()]);
    expect(outbox.claim).toHaveBeenCalled();
    expect(email).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: "invite:1", resourceType: "INVITATION" }));
    expect(outbox.complete).toHaveBeenCalledWith("job-1", "fence-1", expect.anything());
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ actorType: "SYSTEM", summary: expect.objectContaining({ deliveryStatus: "COMPLETED" }) }), expect.anything());
  });

  it("never decrypts an unclaimed payload, rejects unsupported work safely, and cannot let a stale lease settle", async () => {
    const outbox = repository(message({ messageType: "OTHER" }), "STALE");
    const email = vi.fn();
    const audit = vi.fn();
    await new OutboxWorker({ repository: outbox as any, keys: key, email, provision: vi.fn(), audit }).drain();
    expect(email).not.toHaveBeenCalled();
    expect(outbox.retry).toHaveBeenCalledWith("job-1", "fence-1", "UNSUPPORTED", expect.any(String), expect.anything());
    expect(audit).not.toHaveBeenCalled();
  });

  it.each([["COMPLETED", "READY"], ["RETRY_SCHEDULED", undefined], ["FAILED", "FAILED"]])("settles routine provisioning only after an applied %s outcome", async (result, provisioningStatus) => {
    const outbox = repository(message({ messageType: "ROUTINE_PROVISION", payloadEncrypted: encryptPayload({ studentProfileId: "student-1" }, key) }), result);
    const audit = vi.fn();
    await new OutboxWorker({ repository: outbox as any, keys: key, email: vi.fn(), provision: result === "COMPLETED" ? vi.fn() : vi.fn().mockRejectedValue(new Error("temporary")), audit }).drain();
    const tx = outbox.transactions[0];
    expect(outbox.inTransaction).toHaveBeenCalled();
    if (provisioningStatus) expect(audit).toHaveBeenCalledWith(expect.objectContaining({ summary: expect.objectContaining({ deliveryStatus: expect.stringContaining(result) }) }), expect.anything());
    else expect(audit).toHaveBeenCalledWith(expect.objectContaining({ summary: expect.objectContaining({ deliveryStatus: "RETRY_SCHEDULED" }) }), expect.anything());
    if (provisioningStatus) expect(tx.studentProfile.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { provisioningStatus } }));
    else expect(tx.studentProfile.updateMany).not.toHaveBeenCalled();
  });
});
