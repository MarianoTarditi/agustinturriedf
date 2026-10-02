import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  paymentConfigFind: vi.fn(), paymentConfigUpdateMany: vi.fn(), transaction: vi.fn(),
  studentFindMany: vi.fn(), historyAggregate: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  paymentConfig: { findUniqueOrThrow: mocks.paymentConfigFind, updateMany: mocks.paymentConfigUpdateMany },
  studentProfile: { findMany: mocks.studentFindMany }, paymentHistory: { aggregate: mocks.historyAggregate },
  $transaction: mocks.transaction,
} }));
vi.mock("@/features/audit/repository", () => ({ auditRepository: { append: vi.fn() } }));

import { paymentsRepository } from "@/features/payments/repository";

describe("PaymentsRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads only the GLOBAL config singleton", async () => {
    mocks.paymentConfigFind.mockResolvedValue({ id: "GLOBAL", version: 1 });
    await paymentsRepository.getGlobalPaymentConfig();
    expect(mocks.paymentConfigFind).toHaveBeenCalledWith({ where: { id: "GLOBAL" } });
  });

  it("initializes immediate debt from the global snapshot in the supplied transaction", async () => {
    const tx = { paymentConfig: { findUniqueOrThrow: vi.fn().mockResolvedValue({ defaultMonthlyAmountInCents: 3_000_000 }) }, currentPayment: { create: vi.fn().mockResolvedValue({ id: "cp-1" }) } };
    await paymentsRepository.initializeCurrentPaymentForStudent({ studentProfileId: "sp-1", startDate: new Date("2026-05-01T03:00:00Z"), transaction: tx });
    expect(tx.currentPayment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amountInCents: 3_000_000, outstandingAmountInCents: 3_000_000, version: 1 }) });
  });

  it("uses a PostgreSQL row lock before evaluating an exact payment", async () => {
    const tx = {
      $queryRaw: vi.fn(),
      currentPayment: {
        findFirst: vi.fn().mockResolvedValue({ id: "cp-1", studentProfileId: "sp-1", amountInCents: 3_000_000, outstandingAmountInCents: 3_000_000, dueDate: new Date("2026-05-31T03:00:00Z"), overdueSinceDate: null, version: 1 }),
        update: vi.fn().mockResolvedValue({ id: "cp-1", version: 2 }),
      },
      paymentHistory: { create: vi.fn().mockResolvedValue({ id: "ph-1" }) }, auditEvent: { create: vi.fn() },
    };
    mocks.transaction.mockImplementation((callback) => callback(tx));
    const result = await paymentsRepository.registerPayment({ actor: { id: "admin-1", role: "ADMIN" }, studentProfileId: "sp-1", amountInCents: 3_000_000, paymentDate: new Date("2026-05-01T03:00:00Z"), expectedCurrentPaymentVersion: 1 });
    expect(result.ok).toBe(true);
    expect(tx.$queryRaw).toHaveBeenCalledOnce();
    expect(tx.paymentHistory.create).toHaveBeenCalledOnce();
    expect(tx.currentPayment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ outstandingAmountInCents: 0, version: { increment: 1 } }) }));
  });

  it.each([2_999_999, 3_000_001])("rejects non-exact amount %s without history", async (amountInCents) => {
    const tx = {
      $queryRaw: vi.fn(),
      currentPayment: { findFirst: vi.fn().mockResolvedValue({ id: "cp-1", amountInCents: 3_000_000, outstandingAmountInCents: 3_000_000, dueDate: new Date("2026-05-31T03:00:00Z"), overdueSinceDate: null, version: 1 }) },
      paymentHistory: { create: vi.fn() },
    };
    mocks.transaction.mockImplementation((callback) => callback(tx));
    const result = await paymentsRepository.registerPayment({ actor: { id: "admin-1", role: "ADMIN" }, studentProfileId: "sp-1", amountInCents, paymentDate: new Date("2026-05-01T03:00:00Z"), expectedCurrentPaymentVersion: 1 });
    expect(result).toMatchObject({ ok: false, reason: "AMOUNT_MISMATCH" });
    expect(tx.paymentHistory.create).not.toHaveBeenCalled();
  });

  it("rejects zero effective debt without history", async () => {
    const tx = {
      $queryRaw: vi.fn(),
      currentPayment: { findFirst: vi.fn().mockResolvedValue({ id: "cp-1", amountInCents: 3_000_000, outstandingAmountInCents: 0, dueDate: new Date("2026-05-31T03:00:00Z"), overdueSinceDate: null, version: 2 }) },
      paymentHistory: { create: vi.fn() },
    };
    mocks.transaction.mockImplementation((callback) => callback(tx));
    const result = await paymentsRepository.registerPayment({ actor: { id: "admin-1", role: "ADMIN" }, studentProfileId: "sp-1", amountInCents: 3_000_000, paymentDate: new Date("2026-05-01T03:00:00Z"), expectedCurrentPaymentVersion: 2 });
    expect(result).toEqual({ ok: false, reason: "NO_DEBT" });
    expect(tx.paymentHistory.create).not.toHaveBeenCalled();
  });

  it("allows one winner for two commands opened from the same version", async () => {
    let row = { id: "cp-1", amountInCents: 3_000_000, outstandingAmountInCents: 3_000_000, dueDate: new Date("2026-05-31T03:00:00Z"), overdueSinceDate: null, version: 1 };
    const history: unknown[] = [];
    const tx = {
      $queryRaw: vi.fn(),
      currentPayment: {
        findFirst: vi.fn(async () => ({ ...row })),
        update: vi.fn(async ({ data }) => (row = { ...row, outstandingAmountInCents: data.outstandingAmountInCents, dueDate: data.dueDate, overdueSinceDate: data.overdueSinceDate, version: row.version + 1 })),
      },
      paymentHistory: { create: vi.fn(async ({ data }) => (history.push(data), data)) }, auditEvent: { create: vi.fn() },
    };
    mocks.transaction.mockImplementation((callback) => callback(tx));
    const command = () => paymentsRepository.registerPayment({ actor: { id: "admin-1", role: "ADMIN" }, studentProfileId: "sp-1", amountInCents: 3_000_000, paymentDate: new Date("2026-05-01T03:00:00Z"), expectedCurrentPaymentVersion: 1 });
    const winner = await command();
    const loser = await command();
    expect(winner.ok).toBe(true);
    expect(loser).toEqual({ ok: false, reason: "CONFLICT" });
    expect(history).toHaveLength(1);
    expect(row.outstandingAmountInCents).toBe(0);
  });

  it("materializes old-snapshot debt before editing only future cycle state", async () => {
    const update = vi.fn().mockResolvedValue({ id: "cp-1", version: 2 });
    const tx = {
      $queryRaw: vi.fn(),
      currentPayment: {
        findFirst: vi.fn().mockResolvedValue({ id: "cp-1", amountInCents: 3_000_000, outstandingAmountInCents: 0, dueDate: new Date("2026-05-01T03:00:00Z"), overdueSinceDate: null, version: 1 }),
        update,
      }, auditEvent: { create: vi.fn() },
    };
    mocks.transaction.mockImplementation((callback) => callback(tx));
    const result = await paymentsRepository.editCurrentPayment({ actor: { id: "admin-1", role: "ADMIN" }, studentProfileId: "sp-1", amountInCents: 4_000_000, startDate: new Date("2026-06-01T03:00:00Z"), evaluationDate: new Date("2026-05-01T03:00:00Z"), expectedCurrentPaymentVersion: 1 });
    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amountInCents: 4_000_000, outstandingAmountInCents: 3_000_000 }) }));
  });
});
