import { describe, expect, it, vi } from "vitest";

import { OutboxRepository } from "./repository";

type Row = Record<string, any>;
const now = new Date("2026-09-18T12:00:00.000Z");

function harness(rows: Row[]) {
  const outboxMessage = {
    create: vi.fn(async ({ data }) => data),
    findFirst: vi.fn(async ({ where = {} } = {}) => rows.find((row) => {
      if (where.id) return row.id === where.id && row.status === where.status && row.fencingToken === where.fencingToken;
      return row.status === "PENDING" && row.availableAt <= now || row.status === "PROCESSING" && row.leaseExpiresAt <= now;
    }) ?? null),
    updateMany: vi.fn(async ({ where, data }) => {
      const row = rows.find((candidate) => candidate.id === where.id);
      if (!row) return { count: 0 };
      const eligible = data.status === "PROCESSING"
        ? row.status === "PENDING" && row.availableAt <= now || row.status === "PROCESSING" && row.leaseExpiresAt <= now
        : where.status?.in ? where.status.in.includes(row.status) : row.status === "PROCESSING" && row.fencingToken === where.fencingToken;
      if (!eligible) return { count: 0 };
      Object.assign(row, { ...data, attempts: typeof data.attempts === "object" ? row.attempts + data.attempts.increment : data.attempts });
      return { count: 1 };
    }),
  };
  return { rows, outboxMessage };
}

const message = (overrides: Partial<Row> = {}): Row => ({
  id: "message-1", messageType: "EMAIL", resourceType: "INVITATION", resourceId: "invite-1", idempotencyKey: "invite:1",
  payloadEncrypted: "ciphertext", status: "PENDING", attempts: 0, availableAt: now, leaseExpiresAt: null, fencingToken: null, ...overrides,
});

describe("outbox durable state machine", () => {
  it("keeps caller-owned enqueue writes inside a rollback boundary", async () => {
    const db = harness([]);
    const staged: unknown[] = [];
    db.outboxMessage.create.mockImplementation(async ({ data }) => (staged.push(data), data));
    try {
      await new OutboxRepository().enqueue({ messageType: "EMAIL", resourceType: "INVITATION", resourceId: "invite-1", idempotencyKey: "invite:1", payloadEncrypted: "ciphertext" }, db);
      throw new Error("rollback");
    } catch { /* caller owns the transaction rollback */ }
    expect(db.outboxMessage.create).toHaveBeenCalledOnce();
    expect(staged).toHaveLength(1);
  });

  it("claims one pending or expired lease with an opaque token and bounded lease", async () => {
    expect(await new OutboxRepository(harness([message()])).claim(now)).toMatchObject({ status: "PROCESSING" });
    const db = harness([message({ status: "PROCESSING", leaseExpiresAt: new Date(now.getTime() - 1) })]);
    const repository = new OutboxRepository(db);
    const [first, second] = await Promise.all([repository.claim(now), repository.claim(now)]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
    const claim = first ?? second;
    expect(claim?.fencingToken).toMatch(/^[0-9a-f-]{36}$/);
    expect(claim?.leaseExpiresAt.getTime()).toBeGreaterThan(now.getTime());
    expect(claim?.leaseExpiresAt.getTime()).toBeLessThanOrEqual(now.getTime() + 300_000);
  });

  it("settles only the active PROCESSING claim and rejects stale fences", async () => {
    const db = harness([message({ status: "PROCESSING", fencingToken: "current", leaseExpiresAt: new Date(now.getTime() + 1) })]);
    const repository = new OutboxRepository(db);
    await expect(repository.complete("message-1", "wrong", now)).resolves.toBe(false);
    await expect(repository.retry("message-1", "wrong", "PROVIDER", "token=secret", now)).resolves.toBe(false);
    await expect(repository.fail("message-1", "wrong", "PROVIDER", "password=secret", now)).resolves.toBe(false);
    await expect(repository.complete("message-1", "current", now)).resolves.toBe(true);
    expect(db.rows[0]).toMatchObject({ status: "COMPLETED", fencingToken: null, payloadEncrypted: "ciphertext", idempotencyKey: "invite:1" });
  });

  it("uses bounded exponential retry metadata and fails at the attempt limit without secrets", async () => {
    const db = harness([message({ status: "PROCESSING", fencingToken: "active", attempts: 1 })]);
    const repository = new OutboxRepository(db, { maxAttempts: 3, baseRetryMs: 1_000 });
    expect(await repository.retry("message-1", "active", "PROVIDER", "Bearer token=raw-secret", now)).toBe(true);
    expect(db.rows[0]).toMatchObject({ status: "PENDING", failureCategory: "PROVIDER" });
    expect(db.rows[0].failureSummary).not.toContain("raw-secret");
    expect(db.rows[0].availableAt.getTime()).toBe(now.getTime() + 2_000);
    Object.assign(db.rows[0], { status: "PROCESSING", fencingToken: "next", attempts: 3 });
    await repository.retry("message-1", "next", "PROVIDER", "provider failure", now);
    expect(db.rows[0]).toMatchObject({ status: "FAILED", payloadEncrypted: "ciphertext" });
  });

  it("redrives terminal messages once without losing encrypted payload or idempotency identity", async () => {
    const db = harness([message({ status: "FAILED", attempts: 3, fencingToken: "stale", failureCategory: "PROVIDER", failureSummary: "safe" })]);
    const repository = new OutboxRepository(db);
    const [first, second] = await Promise.all([repository.redrive("message-1", now), repository.redrive("message-1", now)]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(db.rows[0]).toMatchObject({ status: "PENDING", attempts: 0, fencingToken: null, leaseExpiresAt: null, failureCategory: null, payloadEncrypted: "ciphertext", idempotencyKey: "invite:1" });
    Object.assign(db.rows[0], { status: "COMPLETED", attempts: 1 });
    expect(await repository.redrive("message-1", now)).toBe(true);
  });
});
