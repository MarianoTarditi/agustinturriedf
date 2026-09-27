import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

type OutboxWrite = { messageType: string; resourceType: string; resourceId: string; idempotencyKey: string; payloadEncrypted: string };
type Update = { count: number };
export type SettlementResult = "STALE" | "COMPLETED" | "RETRY_SCHEDULED" | "FAILED";
export type RedriveResult = { kind: "APPLIED" } | { kind: "PAYLOAD_PURGED" } | { kind: "NOT_REDRIVABLE" };
export type OutboxTransaction = { outboxMessage: { create: (input: { data: OutboxWrite }) => Promise<unknown>; findFirst?: (input: any) => Promise<any>; updateMany?: (input: any) => Promise<Update> }; auditEvent?: { create: (input: { data: unknown }) => Promise<unknown> } };
export type OutboxStateTransaction = OutboxTransaction & { outboxMessage: Required<OutboxTransaction["outboxMessage"]> };
type OutboxClient = OutboxStateTransaction & { $transaction?: <T>(operation: (transaction: OutboxStateTransaction) => Promise<T>) => Promise<T> };

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

  inTransaction<T>(operation: (transaction: OutboxStateTransaction) => Promise<T>) { return this.client.$transaction ? this.client.$transaction(operation) : operation(this.client); }

  complete(id: string, fencingToken: string, transaction: OutboxStateTransaction, now = new Date()) { return this.settle(id, fencingToken, { status: "COMPLETED", completedAt: now, leaseExpiresAt: null, fencingToken: null, payloadEncrypted: null }, "COMPLETED", transaction); }
  fail(id: string, fencingToken: string, category: string, summary: string, transaction: OutboxStateTransaction, now = new Date(), purgePayload = true) { return this.settle(id, fencingToken, { status: "FAILED", completedAt: now, leaseExpiresAt: null, fencingToken: null, ...(purgePayload ? { payloadEncrypted: null } : {}), ...this.failure(category, summary) }, "FAILED", transaction); }

  async retry(id: string, fencingToken: string, category: string, summary: string, transaction: OutboxStateTransaction, now = new Date()): Promise<SettlementResult> {
    const row = await transaction.outboxMessage.findFirst({ where: { id, status: "PROCESSING", fencingToken } });
    if (!row) return "STALE";
    if (row.attempts >= this.maxAttempts) return this.fail(id, fencingToken, category, summary, transaction, now, row.messageType === "EMAIL");
    return this.settle(id, fencingToken, { status: "PENDING", availableAt: new Date(now.getTime() + Math.min(300_000, this.baseRetryMs * 2 ** row.attempts)), leaseExpiresAt: null, fencingToken: null, ...this.failure(category, summary) }, "RETRY_SCHEDULED", transaction);
  }

  async redrive(id: string, now = new Date()): Promise<RedriveResult> {
    return this.inTransaction(async (transaction) => {
      const row = await transaction.outboxMessage.findFirst({ where: { id, status: "FAILED" } });
      if (!row) return { kind: "NOT_REDRIVABLE" };
      if (row.messageType === "EMAIL" || !row.payloadEncrypted) return { kind: "PAYLOAD_PURGED" };
      const result = await transaction.outboxMessage.updateMany({ where: { id, status: "FAILED", payloadEncrypted: row.payloadEncrypted }, data: { status: "PENDING", attempts: 0, availableAt: now, leaseExpiresAt: null, fencingToken: null, completedAt: null, failureCategory: null, failureSummary: null } });
      if (!result.count) return { kind: "NOT_REDRIVABLE" };
      if (transaction.auditEvent) await transaction.auditEvent.create({ data: { eventType: "OUTBOX_REDRIVEN", actorType: "SYSTEM", summary: { deliveryStatus: "REDRIVEN", resourceType: "OUTBOX", resourceRef: id } } });
      return { kind: "APPLIED" };
    });
  }
  private async settle(id: string, fencingToken: string, data: Record<string, unknown>, applied: Exclude<SettlementResult, "STALE">, transaction: OutboxStateTransaction): Promise<SettlementResult> {
    const result = await transaction.outboxMessage.updateMany({ where: { id, status: "PROCESSING", fencingToken }, data });
    return result.count ? applied : "STALE";
  }
  private failure(category: string, summary: string) { return { failureCategory: safeText(category, 64) || "UNKNOWN", failureSummary: safeText(summary, 256) || "Delivery failed" }; }
}

export const outboxRepository = new OutboxRepository();
