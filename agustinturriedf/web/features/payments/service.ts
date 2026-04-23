import { ApiError } from "@/lib/http/api-response";

import {
  type PaymentDashboardView,
  paymentsRepository,
} from "@/features/payments/repository";
import {
  addDays,
  getRollingThirtyDayWindow,
  isDueSoon,
  isOverdue,
  normalizeToBuenosAiresDay,
  toEndOfDayUtc,
} from "@/features/payments/timezone";

export type PaymentDashboardFilters = {
  query?: string;
  view?: PaymentDashboardView;
};

export type RegisterPaymentInput = {
  studentProfileId: string;
  amountInCents: number;
  paymentDate: Date;
};

export type EditPaymentInput = {
  studentProfileId: string;
  amountInCents: number;
  startDate: Date;
};

type DashboardRowRecord = {
  id: string;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  currentPayment: {
    id: string;
    amountInCents: number;
    startDate: Date;
    dueDate: Date;
  } | null;
};

export type PaymentDashboardRowDTO = {
  studentProfileId: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  studentStatus: "ACTIVE" | "INACTIVE" | "BLOCKED";
  paymentStatus: "CURRENT" | "DUE_SOON" | "OVERDUE";
  amountInCents: number;
  startDate: Date;
  dueDate: Date;
  daysToExpire: number;
};

export type PaymentDashboardDTO = {
  cards: {
    collectedCount: number;
    collectedAmountInCents: number;
    dueSoonCount: number;
    overdueCount: number;
    overdueAmountInCents: number;
    estimatedTotalInCents: number;
    studentsInEstimatedTotal: number;
  };
  rows: PaymentDashboardRowDTO[];
  config: {
    trainerId: string;
    defaultMonthlyAmountInCents: number;
  };
  filters: {
    query: string;
    view: PaymentDashboardView;
  };
};

const resolvePaymentStatus = (dueDate: Date, now: Date) => {
  if (isOverdue(dueDate, now)) {
    return "OVERDUE" as const;
  }

  if (isDueSoon(dueDate, now, 3)) {
    return "DUE_SOON" as const;
  }

  return "CURRENT" as const;
};

const calculateDaysToExpire = (dueDate: Date, now: Date) => {
  const dueDateAtDayPrecision = normalizeToBuenosAiresDay(dueDate);
  const today = normalizeToBuenosAiresDay(now);

  return Math.floor((dueDateAtDayPrecision.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
};

const mapDashboardRow = (row: DashboardRowRecord, now: Date): PaymentDashboardRowDTO | null => {
  if (!row.currentPayment) {
    return null;
  }

  return {
    studentProfileId: row.id,
    userId: row.user.id,
    fullName: `${row.user.firstName} ${row.user.lastName}`.trim(),
    email: row.user.email,
    phone: row.user.phone,
    studentStatus: row.status,
    paymentStatus: resolvePaymentStatus(row.currentPayment.dueDate, now),
    amountInCents: row.currentPayment.amountInCents,
    startDate: row.currentPayment.startDate,
    dueDate: row.currentPayment.dueDate,
    daysToExpire: calculateDaysToExpire(row.currentPayment.dueDate, now),
  };
};

export class PaymentsService {
  async getDashboard(trainerId: string, filters: PaymentDashboardFilters = {}, now = new Date()) {
    const normalizedView: PaymentDashboardView = filters.view ?? "ALL";
    const normalizedQuery = filters.query?.trim() ?? "";
    const today = normalizeToBuenosAiresDay(now);
    const dueThisWeekLimit = addDays(today, 7);
    const { startDate, endDate } = getRollingThirtyDayWindow(now);

    const [trainerConfig, dashboardRowsRaw, rollingCollectionSummary] = await Promise.all([
      paymentsRepository.getOrCreateTrainerConfig(trainerId),
      paymentsRepository.findDashboardRows({
        trainerId,
        query: normalizedQuery,
        view: normalizedView,
        today,
        dueThisWeekLimit,
      }),
      paymentsRepository.getRollingCollectionSummary({
        trainerId,
        query: normalizedQuery,
        startDate,
        endDateInclusive: toEndOfDayUtc(endDate),
      }),
    ]);

    const mappedRows = (dashboardRowsRaw as DashboardRowRecord[])
      .map((row) => mapDashboardRow(row, now))
      .filter((row): row is PaymentDashboardRowDTO => row !== null);

    const dueSoonCount = mappedRows.filter((row) => row.paymentStatus === "DUE_SOON").length;
    const overdueRows = mappedRows.filter((row) => row.paymentStatus === "OVERDUE");
    const overdueAmountInCents = overdueRows.reduce(
      (accumulator: number, row: PaymentDashboardRowDTO) => accumulator + row.amountInCents,
      0
    );

    const estimatedRows = mappedRows.filter((row) => {
      const normalizedStartDate = normalizeToBuenosAiresDay(row.startDate);

      return (
        normalizedStartDate.getTime() >= startDate.getTime() &&
        normalizedStartDate.getTime() <= endDate.getTime()
      );
    });

    const estimatedTotalInCents = estimatedRows.reduce(
      (accumulator: number, row: PaymentDashboardRowDTO) => accumulator + row.amountInCents,
      0
    );

    return {
      cards: {
        collectedCount: rollingCollectionSummary._count?._all ?? 0,
        collectedAmountInCents: rollingCollectionSummary._sum?.amountInCents ?? 0,
        dueSoonCount,
        overdueCount: overdueRows.length,
        overdueAmountInCents,
        estimatedTotalInCents,
        studentsInEstimatedTotal: estimatedRows.length,
      },
      rows: mappedRows,
      config: {
        trainerId,
        defaultMonthlyAmountInCents: trainerConfig.defaultMonthlyAmountInCents,
      },
      filters: {
        query: normalizedQuery,
        view: normalizedView,
      },
    } satisfies PaymentDashboardDTO;
  }

  async registerPayment(trainerId: string, actorId: string, input: RegisterPaymentInput) {
    if (!input.studentProfileId) {
      throw new ApiError("studentProfileId es obligatorio", 400, "VALIDATION_ERROR");
    }

    if (!Number.isInteger(input.amountInCents) || input.amountInCents <= 0) {
      throw new ApiError("amountInCents debe ser un entero positivo", 400, "VALIDATION_ERROR");
    }

    const result = await paymentsRepository.registerPayment({
      trainerId,
      studentProfileId: input.studentProfileId,
      amountInCents: input.amountInCents,
      paymentDate: input.paymentDate,
      recordedByUserId: actorId,
    });

    if (!result) {
      throw new ApiError("Pago actual no encontrado para el alumno", 404, "NOT_FOUND");
    }

    return result;
  }

  async editCurrentPayment(trainerId: string, input: EditPaymentInput) {
    if (!input.studentProfileId) {
      throw new ApiError("studentProfileId es obligatorio", 400, "VALIDATION_ERROR");
    }

    if (!Number.isInteger(input.amountInCents) || input.amountInCents <= 0) {
      throw new ApiError("amountInCents debe ser un entero positivo", 400, "VALIDATION_ERROR");
    }

    const updatedCurrentPayment = await paymentsRepository.editCurrentPayment({
      trainerId,
      studentProfileId: input.studentProfileId,
      amountInCents: input.amountInCents,
      startDate: input.startDate,
    });

    if (!updatedCurrentPayment) {
      throw new ApiError("Pago actual no encontrado para el alumno", 404, "NOT_FOUND");
    }

    return updatedCurrentPayment;
  }

  async getTrainerDefaultAmount(trainerId: string) {
    return paymentsRepository.getOrCreateTrainerConfig(trainerId);
  }

  async updateTrainerDefaultAmount(trainerId: string, defaultMonthlyAmountInCents: number) {
    if (!Number.isInteger(defaultMonthlyAmountInCents) || defaultMonthlyAmountInCents <= 0) {
      throw new ApiError(
        "defaultMonthlyAmountInCents debe ser un entero positivo",
        400,
        "VALIDATION_ERROR"
      );
    }

    return paymentsRepository.updateTrainerDefaultAmount(trainerId, defaultMonthlyAmountInCents);
  }

  async initializeCurrentPaymentForStudent(
    trainerId: string,
    studentProfileId: string,
    startDate: Date,
    amountInCents?: number
  ) {
    if (!studentProfileId) {
      throw new ApiError("studentProfileId es obligatorio", 400, "VALIDATION_ERROR");
    }

    if (amountInCents !== undefined && (!Number.isInteger(amountInCents) || amountInCents <= 0)) {
      throw new ApiError("amountInCents debe ser un entero positivo", 400, "VALIDATION_ERROR");
    }

    return paymentsRepository.initializeCurrentPaymentForStudent({
      trainerId,
      studentProfileId,
      startDate,
      amountInCents,
    });
  }
}

export const paymentsService = new PaymentsService();
