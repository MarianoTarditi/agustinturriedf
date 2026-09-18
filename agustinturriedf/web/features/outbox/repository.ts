import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

type OutboxWrite = { messageType: string; resourceType: string; resourceId: string; idempotencyKey: string; payloadEncrypted: string };
type Update = { count: number };
export type OutboxTransaction = { outboxMessage: { create: (input: { data: OutboxWrite }) => Promise<unknown> } };
type OutboxClient = OutboxTransaction & { outboxMessage: OutboxTransaction["outboxMessage"] & { findFirst: (input: any) => Promise<any>; updateMany: (input: any) => Promise<Update> } };

const safeText = (value: string, limit: number) => value.replace(/(?:bearer\s+|token|password|secret|hash)\S*/gi, "[redacted]").replace(/\s+/g, " ").trim().slice(0, limit);

export class OutboxRepository {
  private readonly client: OutboxClient;
  private readonly maxAttempts: number;
  private readonly baseRetryMs: number;

  constructor(client = prisma as unknown as OutboxClient, options: { maxAttempts?: number; baseRetryMs?: number } = {}) {
    this.client = client;
    this.maxAttempts = Math.max(1, options.maxAttempts ?? 5);
    this.baseRetryMs = Math.min(300_000, Math.max(1_000, options.baseRetryMs ?? 1_000));
  }

  enqueue(data: OutboxWrite, transaction: OutboxTransaction) { return transaction.outboxMessage.create({ data }); }

  async claim(now = new Date(), leaseMs = 60_000) {
    const row = await this.client.outboxMessage.findFirst({ where: { OR: [{ status: "PENDING", availableAt: { lte: now } }, { status: "PROCESSING", leaseExpiresAt: { lte: now } }] }, orderBy: { availableAt: "asc" } });
    if (!row) return null;
    const fencingToken = randomUUID();
    const leaseExpiresAt = new Date(now.getTime() + Math.min(300_000, Math.max(1_000, leaseMs)));
    const result = await this.client.outboxMessage.updateMany({ where: { id: row.id, OR: [{ status: "PENDING", availableAt: { lte: now } }, { status: "PROCESSING", leaseExpiresAt: { lte: now } }] }, data: { status: "PROCESSING", fencingToken, leaseExpiresAt, attempts: { increment: 1 } } });
    return result.count ? { ...row, attempts: row.attempts + 1, fencingToken, leaseExpiresAt } : null;
  }

  complete(id: string, fencingToken: string, now = new Date()) { return this.settle(id, fencingToken, { status: "COMPLETED", completedAt: now, leaseExpiresAt: null, fencingToken: null }); }
  fail(id: string, fencingToken: string, category: string, summary: string, now = new Date()) { return this.settle(id, fencingToken, { status: "FAILED", completedAt: now, leaseExpiresAt: null, fencingToken: null, ...this.failure(category, summary) }); }

  async retry(id: string, fencingToken: string, category: string, summary: string, now = new Date()) {
    const row = await this.client.outboxMessage.findFirst({ where: { id, status: "PROCESSING", fencingToken } });
    if (!row) return false;
    if (row.attempts >= this.maxAttempts) return this.fail(id, fencingToken, category, summary, now);
    return this.settle(id, fencingToken, { status: "PENDING", availableAt: new Date(now.getTime() + Math.min(300_000, this.baseRetryMs * 2 ** row.attempts)), leaseExpiresAt: null, fencingToken: null, ...this.failure(category, summary) });
  }

  redrive(id: string, now = new Date()) { return this.client.outboxMessage.updateMany({ where: { id, status: { in: ["FAILED", "COMPLETED"] } }, data: { status: "PENDING", attempts: 0, availableAt: now, leaseExpiresAt: null, fencingToken: null, completedAt: null, failureCategory: null, failureSummary: null } }).then((result) => Boolean(result.count)); }
  private settle(id: string, fencingToken: string, data: Record<string, unknown>) { return this.client.outboxMessage.updateMany({ where: { id, status: "PROCESSING", fencingToken }, data }).then((result) => Boolean(result.count)); }
  private failure(category: string, summary: string) { return { failureCategory: safeText(category, 64) || "UNKNOWN", failureSummary: safeText(summary, 256) || "Delivery failed" }; }
}
