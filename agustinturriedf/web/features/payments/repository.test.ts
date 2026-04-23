import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  trainerConfigUpsertMock,
  studentProfileFindManyMock,
  paymentHistoryAggregateMock,
  transactionMock,
} = vi.hoisted(() => ({
  trainerConfigUpsertMock: vi.fn(),
  studentProfileFindManyMock: vi.fn(),
  paymentHistoryAggregateMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trainerConfig: {
      upsert: trainerConfigUpsertMock,
    },
    studentProfile: {
      findMany: studentProfileFindManyMock,
    },
    paymentHistory: {
      aggregate: paymentHistoryAggregateMock,
    },
    $transaction: transactionMock,
  },
}));

import { DEFAULT_MONTHLY_AMOUNT_IN_CENTS, paymentsRepository } from "@/features/payments/repository";

describe("PaymentsRepository config semantics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes trainer default amount with ARS 30000 in cents", async () => {
    trainerConfigUpsertMock.mockResolvedValue({ defaultMonthlyAmountInCents: DEFAULT_MONTHLY_AMOUNT_IN_CENTS });

    await paymentsRepository.getOrCreateTrainerConfig("trainer-1");

    expect(trainerConfigUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          defaultMonthlyAmountInCents: DEFAULT_MONTHLY_AMOUNT_IN_CENTS,
        }),
      })
    );
  });

  it("updates default amount without mutating current payment rows", async () => {
    trainerConfigUpsertMock.mockResolvedValue({ defaultMonthlyAmountInCents: 3_200_000 });

    await paymentsRepository.updateTrainerDefaultAmount("trainer-1", 3_200_000);

    expect(trainerConfigUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          defaultMonthlyAmountInCents: 3_200_000,
        },
      })
    );
  });
});

describe("PaymentsRepository transaction semantics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registerPayment inserts history and resets current payment cycle", async () => {
    const currentPaymentFindFirstMock = vi.fn().mockResolvedValue({ id: "cp-1", studentProfileId: "sp-1" });
    const currentPaymentUpdateMock = vi.fn().mockResolvedValue({ id: "cp-1" });
    const paymentHistoryCreateMock = vi.fn().mockResolvedValue({ id: "ph-1" });

    transactionMock.mockImplementation(async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        currentPayment: {
          findFirst: currentPaymentFindFirstMock,
          update: currentPaymentUpdateMock,
        },
        paymentHistory: {
          create: paymentHistoryCreateMock,
        },
      })
    );

    await paymentsRepository.registerPayment({
      trainerId: "trainer-1",
      studentProfileId: "sp-1",
      amountInCents: 3_000_000,
      paymentDate: new Date("2026-04-21T12:00:00.000Z"),
      recordedByUserId: "trainer-1",
    });

    expect(paymentHistoryCreateMock).toHaveBeenCalledTimes(1);
    expect(currentPaymentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountInCents: 3_000_000,
        }),
      })
    );
  });

  it("editCurrentPayment updates current payment only (no history insert)", async () => {
    const currentPaymentFindFirstMock = vi.fn().mockResolvedValue({ id: "cp-1", studentProfileId: "sp-1" });
    const currentPaymentUpdateMock = vi.fn().mockResolvedValue({ id: "cp-1" });

    studentProfileFindManyMock.mockResolvedValue([]);

    // editCurrentPayment is not wrapped in prisma.$transaction; this mock verifies no history call path exists.
    (transactionMock as any).mockReset();

    // monkey-patch through mocked prisma singleton methods used by repository
    const prismaModule = await import("@/lib/prisma");
    (prismaModule.prisma as any).currentPayment = {
      findFirst: currentPaymentFindFirstMock,
      update: currentPaymentUpdateMock,
    };
    (prismaModule.prisma as any).paymentHistory = {
      create: vi.fn(),
    };

    await paymentsRepository.editCurrentPayment({
      trainerId: "trainer-1",
      studentProfileId: "sp-1",
      amountInCents: 2_900_000,
      startDate: new Date("2026-04-21T12:00:00.000Z"),
    });

    expect(currentPaymentUpdateMock).toHaveBeenCalledTimes(1);
    expect((prismaModule.prisma as any).paymentHistory.create).not.toHaveBeenCalled();
  });
});

describe("PaymentsRepository listing filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces student-role filter to exclude non-student/removed actors", async () => {
    studentProfileFindManyMock.mockResolvedValue([]);

    await paymentsRepository.findDashboardRows({
      trainerId: "trainer-1",
      view: "ALL",
      query: "",
      today: new Date("2026-04-21T03:00:00.000Z"),
      dueThisWeekLimit: new Date("2026-04-28T03:00:00.000Z"),
    });

    expect(studentProfileFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          trainerId: "trainer-1",
          user: {
            role: "STUDENT",
          },
        }),
      })
    );
  });
});
