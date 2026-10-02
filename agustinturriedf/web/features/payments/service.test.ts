import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getGlobalPaymentConfig: vi.fn(),
  findDashboardRows: vi.fn(),
  getRollingCollectionSummary: vi.fn(),
  registerPayment: vi.fn(),
  editCurrentPayment: vi.fn(),
  updateGlobalPaymentConfig: vi.fn(),
}));

vi.mock("@/features/payments/repository", () => ({ paymentsRepository: mocks }));

import { paymentsService } from "@/features/payments/service";

describe("PaymentsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGlobalPaymentConfig.mockResolvedValue({ defaultMonthlyAmountInCents: 3_000_000, version: 1 });
    mocks.getRollingCollectionSummary.mockResolvedValue({ _count: { _all: 1 }, _sum: { amountInCents: 3_000_000 } });
  });

  it("derives debt cards and filters from one evaluation day", async () => {
    mocks.findDashboardRows.mockResolvedValue([
      {
        id: "sp-1", status: "ACTIVE",
        user: { id: "u-1", firstName: "Ana", lastName: "A", email: "a@example.com", phone: null },
        currentPayment: { id: "cp-1", amountInCents: 3_000_000, outstandingAmountInCents: 3_000_000,
          startDate: new Date("2026-04-01T03:00:00Z"), dueDate: new Date("2026-05-01T03:00:00Z"), overdueSinceDate: null, version: 4 },
      },
    ]);
    const result = await paymentsService.getDashboard(
      { id: "trainer-1", role: "TRAINER" }, { view: "ALL" }, new Date("2026-05-01T12:00:00Z")
    );
    expect(result.cards.outstandingCount).toBe(1);
    expect(result.cards.outstandingAmountInCents).toBe(6_000_000);
    expect(result.cards.overdueCount).toBe(1);
    expect(result.rows[0]).toMatchObject({ currentPaymentVersion: 4, monthlyAmountInCents: 3_000_000, outstandingAmountInCents: 6_000_000 });
  });

  it("maps stale and exact-amount failures to stable API errors", async () => {
    mocks.registerPayment.mockResolvedValueOnce({ ok: false, reason: "CONFLICT" });
    await expect(paymentsService.registerPayment({ id: "admin-1", role: "ADMIN" }, {
      studentProfileId: "sp-1", amountInCents: 3_000_000, paymentDate: new Date(), expectedCurrentPaymentVersion: 1,
    })).rejects.toMatchObject({ status: 409, code: "PAYMENT_CONFLICT" });

    mocks.registerPayment.mockResolvedValueOnce({ ok: false, reason: "AMOUNT_MISMATCH", details: { expectedAmountInCents: 6_000_000 } });
    await expect(paymentsService.registerPayment({ id: "admin-1", role: "ADMIN" }, {
      studentProfileId: "sp-1", amountInCents: 3_000_000, paymentDate: new Date(), expectedCurrentPaymentVersion: 1,
    })).rejects.toMatchObject({ status: 409, code: "PAYMENT_AMOUNT_MISMATCH" });
  });

  it("returns a stable config conflict", async () => {
    mocks.updateGlobalPaymentConfig.mockResolvedValue(null);
    await expect(paymentsService.updateGlobalPaymentConfig("admin-1", 3_200_000, 1))
      .rejects.toMatchObject({ status: 409, code: "PAYMENT_CONFIG_CONFLICT" });
  });
});
