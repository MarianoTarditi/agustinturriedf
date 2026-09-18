import { describe, expect, it, vi } from "vitest";

import { buildAuditEvent } from "@/features/audit/event-factory";
import { AuditRepository } from "@/features/audit/repository";

import { decryptPayload, encryptPayload } from "./crypto";
import { OutboxRepository } from "./repository";

const key = { id: "test-v1", value: Buffer.alloc(32, 7).toString("base64url") };

describe("outbox foundation", () => {
  it("writes a versioned authenticated envelope without plaintext", () => {
    const envelope = encryptPayload({ token: "synthetic-token" }, key);

    expect(envelope.split(".").slice(0, 2)).toEqual(["v1", "test-v1"]);
    expect(envelope).not.toContain("synthetic-token");
    expect(decryptPayload(envelope, key)).toEqual({ token: "synthetic-token" });
  });

  it("rejects malformed key identifiers, non-canonical segments, wrong lengths, wrong keys, and tampering", () => {
    const envelope = encryptPayload({ token: "synthetic-token" }, key);
    const [version, keyId, iv, tag, ciphertext] = envelope.split(".");
    const invalidEnvelopes = [
      `${version}.key.id.${iv}.${tag}.${ciphertext}`,
      `${version}.${keyId}.${iv}=${tag}.${ciphertext}`,
      `${version}.${keyId}.${Buffer.alloc(11).toString("base64url")}.${tag}.${ciphertext}`,
      `${version}.${keyId}.${iv}.${Buffer.alloc(15).toString("base64url")}.${ciphertext}`,
      `${version}.${keyId}.${iv}.${tag}.${ciphertext.slice(0, -1)}A`,
    ];

    expect(() => encryptPayload({ token: "synthetic-token" }, { ...key, id: "key.id" })).toThrow("Invalid outbox payload");
    expect(() => encryptPayload({ token: "synthetic-token" }, { ...key, id: "" })).toThrow("Invalid outbox payload");
    expect(() => encryptPayload({ token: "synthetic-token" }, { ...key, value: "not-a-key" })).toThrow("Invalid outbox payload");
    for (const invalidEnvelope of invalidEnvelopes) {
      expect(() => decryptPayload(invalidEnvelope, key)).toThrow("Invalid outbox payload");
    }
    expect(() => decryptPayload(envelope, { id: "wrong", value: key.value })).toThrow("Invalid outbox payload");
    expect(() => decryptPayload(envelope, { unknown: key.value })).toThrow("Invalid outbox payload");
  });

  it("uses the caller-supplied transaction for the enqueue write", async () => {
    const create = vi.fn().mockResolvedValue({ id: "outbox-1" });
    const transaction = { outboxMessage: { create } };

    await new OutboxRepository().enqueue(
      { messageType: "EMAIL", resourceType: "INVITATION", resourceId: "invitation-1", idempotencyKey: "invite:1:v1", payloadEncrypted: "encrypted" },
      transaction
    );

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ payloadEncrypted: "encrypted" }) }));
  });

  it("composes domain, audit, and outbox writes inside one rollback boundary", async () => {
    const committed: unknown[] = [];
    const staged: unknown[] = [];
    const transaction = {
      user: { update: vi.fn(async ({ data }) => (staged.push(data), data)) },
      outboxMessage: { create: vi.fn(async ({ data }) => (staged.push(data), data)) },
      auditEvent: { create: vi.fn(async ({ data }) => (staged.push(data), data)) },
    };

    try {
      await transaction.user.update({ data: { status: "ACTIVE" } });
      await new OutboxRepository().enqueue(
        { messageType: "EMAIL", resourceType: "INVITATION", resourceId: "invitation-1", idempotencyKey: "invite:1:v1", payloadEncrypted: encryptPayload({ token: "synthetic-token" }, key) },
        transaction
      );
      await new AuditRepository().append(buildAuditEvent({ eventType: "INVITATION_QUEUED", actor: { type: "SYSTEM" } }), transaction);
      throw new Error("rollback");
    } catch {
      // The transaction owner aborts, so no staged write is committed.
    }

    expect(staged).toHaveLength(3);
    expect(committed).toEqual([]);
  });
});
