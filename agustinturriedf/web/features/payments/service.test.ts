import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getOrCreateTrainerConfigMock,
  findDashboardRowsMock,
  getRollingCollectionSummaryMock,
  registerPaymentMock,
  editCurrentPaymentMock,
} = vi.hoisted(() => ({
  getOrCreateTrainerConfigMock: vi.fn(),
  findDashboardRowsMock: vi.fn(),
  getRollingCollectionSummaryMock: vi.fn(),
  registerPaymentMock: vi.fn(),
  editCurrentPaymentMock: vi.fn(),
}));

vi.mock("@/features/payments/repository", () => ({
  paymentsRepository: {
    getOrCreateTrainerConfig: getOrCreateTrainerConfigMock,
    findDashboardRows: findDashboardRowsMock,
    getRollingCollectionSummary: getRollingCollectionSummaryMock,
    registerPayment: registerPaymentMock,
    editCurrentPayment: editCurrentPaymentMock,
  },
}));

import { paymentsService } from "@/features/payments/service";

describe("PaymentsService.getDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("computes rolling metrics and payment statuses in BA semantics", async () => {
    getOrCreateTrainerConfigMock.mockResolvedValue({
      trainerId: "trainer-1",
      defaultMonthlyAmountInCents: 3_000_000,
    });

    findDashboardRowsMock.mockResolvedValue([
      {
        id: "sp-1",
        status: "ACTIVE",
        user: { id: "u-1", firstName: "Ana", lastName: "A", email: "ana@example.com", phone: null },
        currentPayment: {
          id: "cp-1",
          amountInCents: 3_000_000,
          startDate: new Date("2026-04-20T00:00:00.000Z"),
          dueDate: new Date("2026-04-22T00:00:00.000Z"),
        },
      },
      {
        id: "sp-2",
        status: "INACTIVE",
        user: { id: "u-2", firstName: "Beto", lastName: "B", email: "beto@example.com", phone: null },
        currentPayment: {
          id: "cp-2",
          amountInCents: 2_500_000,
          startDate: new Date("2026-03-10T00:00:00.000Z"),
          dueDate: new Date("2026-04-18T00:00:00.000Z"),
        },
      },
    ]);

    getRollingCollectionSummaryMock.mockResolvedValue({
      _count: { _all: 5 },
      _sum: { amountInCents: 11_000_000 },
    });

    const result = await paymentsService.getDashboard(
      "trainer-1",
      { view: "ALL", query: "" },
      new Date("2026-04-21T12:00:00.000Z")
    );

    expect(result.cards.collectedCount).toBe(5);
    expect(result.cards.collectedAmountInCents).toBe(11_000_000);
    expect(result.cards.dueSoonCount).toBe(1);
    expect(result.cards.overdueCount).toBe(1);
    expect(result.cards.overdueAmountInCents).toBe(2_500_000);
    expect(result.cards.estimatedTotalInCents).toBe(3_000_000);
    expect(result.rows[0]?.paymentStatus).toBe("DUE_SOON");
    expect(result.rows[1]?.paymentStatus).toBe("OVERDUE");
  });
});

describe("PaymentsService register/edit guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws PAYMENT not found on register when repository returns null", async () => {
    registerPaymentMock.mockResolvedValue(null);

    await expect(
      paymentsService.registerPayment("trainer-1", "trainer-1", {
        studentProfileId: "sp-1",
        amountInCents: 3_000_000,
        paymentDate: new Date("2026-04-21T00:00:00.000Z"),
      })
    ).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });

  it("throws NOT_FOUND on edit when repository returns null", async () => {
    editCurrentPaymentMock.mockResolvedValue(null);

    await expect(
      paymentsService.editCurrentPayment("trainer-1", {
        studentProfileId: "sp-1",
        amountInCents: 3_000_000,
        startDate: new Date("2026-04-21T00:00:00.000Z"),
      })
    ).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });
});
