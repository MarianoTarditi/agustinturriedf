import { prisma } from "@/lib/prisma";

import { addDays, normalizeToBuenosAiresDay } from "@/features/payments/timezone";

const prismaPayments = prisma as any;

export const DEFAULT_MONTHLY_AMOUNT_IN_CENTS = 3_000_000;

export type PaymentDashboardView = "ALL" | "DUE_TODAY" | "DUE_THIS_WEEK" | "OVERDUE";

export type FindDashboardRowsRepositoryInput = {
  trainerId: string;
  query?: string;
  view?: PaymentDashboardView;
  today: Date;
  dueThisWeekLimit: Date;
};

type RegisterPaymentRepositoryInput = {
  trainerId: string;
  studentProfileId: string;
  amountInCents: number;
  paymentDate: Date;
  recordedByUserId: string;
};

type EditCurrentPaymentRepositoryInput = {
  trainerId: string;
  studentProfileId: string;
  amountInCents: number;
  startDate: Date;
};

type InitializeCurrentPaymentRepositoryInput = {
  trainerId: string;
  studentProfileId: string;
  startDate: Date;
  amountInCents?: number;
};

type RollingSummaryRepositoryInput = {
  trainerId: string;
  query?: string;
  startDate: Date;
  endDateInclusive: Date;
};

const buildSearchWhere = (query?: string) => {
  const normalizedQuery = query?.trim();

  if (!normalizedQuery) {
    return {};
  }

  return {
    OR: [
      {
        user: {
          firstName: {
            contains: normalizedQuery,
            mode: "insensitive",
          },
        },
      },
      {
        user: {
          lastName: {
            contains: normalizedQuery,
            mode: "insensitive",
          },
        },
      },
      {
        user: {
          email: {
            contains: normalizedQuery,
            mode: "insensitive",
          },
        },
      },
    ],
  };
};

const buildViewWhere = (input: FindDashboardRowsRepositoryInput) => {
  const tomorrow = addDays(input.today, 1);

  if (input.view === "DUE_TODAY") {
    return {
      dueDate: {
        gte: input.today,
        lt: tomorrow,
      },
    };
  }

  if (input.view === "DUE_THIS_WEEK") {
    return {
      dueDate: {
        gte: input.today,
        lte: input.dueThisWeekLimit,
      },
    };
  }

  if (input.view === "OVERDUE") {
    return {
      dueDate: {
        lt: input.today,
      },
    };
  }

  return {};
};

export class PaymentsRepository {
  async getOrCreateTrainerConfig(trainerId: string) {
    return prismaPayments.trainerConfig.upsert({
      where: {
        trainerId,
      },
      update: {},
      create: {
        trainerId,
        defaultMonthlyAmountInCents: DEFAULT_MONTHLY_AMOUNT_IN_CENTS,
      },
    });
  }

  async updateTrainerDefaultAmount(trainerId: string, defaultMonthlyAmountInCents: number) {
    return prismaPayments.trainerConfig.upsert({
      where: {
        trainerId,
      },
      update: {
        defaultMonthlyAmountInCents,
      },
      create: {
        trainerId,
        defaultMonthlyAmountInCents,
      },
    });
  }

  async initializeCurrentPaymentForStudent(input: InitializeCurrentPaymentRepositoryInput) {
    return prismaPayments.$transaction(async (transaction: any) => {
      const trainerConfig = await transaction.trainerConfig.upsert({
        where: {
          trainerId: input.trainerId,
        },
        update: {},
        create: {
          trainerId: input.trainerId,
          defaultMonthlyAmountInCents: DEFAULT_MONTHLY_AMOUNT_IN_CENTS,
        },
      });

      const startDate = normalizeToBuenosAiresDay(input.startDate);
      const dueDate = addDays(startDate, 30);

      return transaction.currentPayment.upsert({
        where: {
          studentProfileId: input.studentProfileId,
        },
        update: {
          amountInCents: input.amountInCents ?? trainerConfig.defaultMonthlyAmountInCents,
          startDate,
          dueDate,
        },
        create: {
          studentProfileId: input.studentProfileId,
          amountInCents: input.amountInCents ?? trainerConfig.defaultMonthlyAmountInCents,
          startDate,
          dueDate,
        },
      });
    });
  }

  async findDashboardRows(input: FindDashboardRowsRepositoryInput) {
    return prismaPayments.studentProfile.findMany({
      where: {
        trainerId: input.trainerId,
        user: {
          role: "STUDENT",
        },
        currentPayment: {
          is: buildViewWhere(input),
        },
        ...buildSearchWhere(input.query),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        currentPayment: true,
      },
      orderBy: {
        currentPayment: {
          dueDate: "asc",
        },
      },
    });
  }

  async getRollingCollectionSummary(input: RollingSummaryRepositoryInput) {
    return prismaPayments.paymentHistory.aggregate({
      where: {
        paymentDate: {
          gte: input.startDate,
          lte: input.endDateInclusive,
        },
        studentProfile: {
          trainerId: input.trainerId,
          ...buildSearchWhere(input.query),
        },
      },
      _count: {
        _all: true,
      },
      _sum: {
        amountInCents: true,
      },
    });
  }

  async registerPayment(input: RegisterPaymentRepositoryInput) {
    return prismaPayments.$transaction(async (transaction: any) => {
      const currentPayment = await transaction.currentPayment.findFirst({
        where: {
          studentProfileId: input.studentProfileId,
          studentProfile: {
            trainerId: input.trainerId,
          },
        },
      });

      if (!currentPayment) {
        return null;
      }

      const paymentDate = normalizeToBuenosAiresDay(input.paymentDate);
      const dueDate = addDays(paymentDate, 30);

      const updatedCurrentPayment = await transaction.currentPayment.update({
        where: {
          id: currentPayment.id,
        },
        data: {
          amountInCents: input.amountInCents,
          startDate: paymentDate,
          dueDate,
        },
      });

      const createdPaymentHistory = await transaction.paymentHistory.create({
        data: {
          studentProfileId: input.studentProfileId,
          currentPaymentId: currentPayment.id,
          amountInCents: input.amountInCents,
          paymentDate,
          recordedByUserId: input.recordedByUserId,
        },
      });

      return {
        currentPayment: updatedCurrentPayment,
        paymentHistory: createdPaymentHistory,
      };
    });
  }

  async editCurrentPayment(input: EditCurrentPaymentRepositoryInput) {
    const normalizedStartDate = normalizeToBuenosAiresDay(input.startDate);
    const dueDate = addDays(normalizedStartDate, 30);

    const currentPayment = await prismaPayments.currentPayment.findFirst({
      where: {
        studentProfileId: input.studentProfileId,
        studentProfile: {
          trainerId: input.trainerId,
        },
      },
    });

    if (!currentPayment) {
      return null;
    }

    return prismaPayments.currentPayment.update({
      where: {
        id: currentPayment.id,
      },
      data: {
        amountInCents: input.amountInCents,
        startDate: normalizedStartDate,
        dueDate,
      },
    });
  }
}

export const paymentsRepository = new PaymentsRepository();
