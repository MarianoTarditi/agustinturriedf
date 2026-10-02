import { evaluateEffectivePaymentDebt } from "@/features/payments/debt";
import {
  type PaymentActorScope,
  type PaymentCommandFailure,
  type PaymentDashboardView,
  paymentsRepository,
} from "@/features/payments/repository";
import {
  calendarDaysBetween,
  getRollingThirtyDayWindow,
  normalizeToBuenosAiresDay,
  toEndOfDayUtc,
} from "@/features/payments/timezone";
import { ApiError } from "@/lib/http/api-response";

export type PaymentDashboardFilters = { query?: string; view?: PaymentDashboardView };
export type RegisterPaymentInput = {
  studentProfileId: string;
  amountInCents: number;
  paymentDate: Date;
  expectedCurrentPaymentVersion: number;
};
export type EditPaymentInput = {
  studentProfileId: string;
  amountInCents: number;
  startDate: Date;
  expectedCurrentPaymentVersion: number;
};

type DashboardRowRecord = {
  id: string;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  user: { id: string; firstName: string; lastName: string; email: string; phone: string | null };
  currentPayment: {
    id: string;
    amountInCents: number;
    outstandingAmountInCents: number;
    startDate: Date;
    dueDate: Date;
    overdueSinceDate: Date | null;
    version: number;
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
  monthlyAmountInCents: number;
  outstandingAmountInCents: number;
  startDate: Date;
  nextChargeDate: Date;
  overdueSinceDate: Date | null;
  daysToExpire: number;
  currentPaymentVersion: number;
};

const mapDashboardRow = (row: DashboardRowRecord, evaluationDate: Date): PaymentDashboardRowDTO | null => {
  if (!row.currentPayment) return null;
  const effective = evaluateEffectivePaymentDebt(row.currentPayment, evaluationDate);
  const today = normalizeToBuenosAiresDay(evaluationDate);
  const daysToExpire = calendarDaysBetween(today, effective.nextChargeDate);
  const overdue = effective.outstandingAmountInCents > 0 && effective.overdueSinceDate !== null;
  const dueSoon = daysToExpire >= 0 && daysToExpire <= 3;
  return {
    studentProfileId: row.id,
    userId: row.user.id,
    fullName: `${row.user.firstName} ${row.user.lastName}`.trim(),
    email: row.user.email,
    phone: row.user.phone,
    studentStatus: row.status,
    paymentStatus: overdue ? "OVERDUE" : dueSoon ? "DUE_SOON" : "CURRENT",
    monthlyAmountInCents: row.currentPayment.amountInCents,
    outstandingAmountInCents: effective.outstandingAmountInCents,
    startDate: row.currentPayment.startDate,
    nextChargeDate: effective.nextChargeDate,
    overdueSinceDate: effective.overdueSinceDate,
    daysToExpire,
    currentPaymentVersion: row.currentPayment.version,
  };
};

const matchesView = (row: PaymentDashboardRowDTO, view: PaymentDashboardView) => {
  if (view === "DUE_TODAY") return row.daysToExpire === 0;
  if (view === "DUE_THIS_WEEK") return row.daysToExpire >= 0 && row.daysToExpire <= 7;
  if (view === "OVERDUE") return row.paymentStatus === "OVERDUE";
  return true;
};

const commandError = (reason: PaymentCommandFailure, details?: Record<string, number>) => {
  if (reason === "NOT_FOUND") return new ApiError("Pago actual no encontrado para el alumno", 404, "NOT_FOUND");
  if (reason === "CONFLICT") return new ApiError("El estado del pago cambió. Actualice la vista e inténtelo nuevamente.", 409, "PAYMENT_CONFLICT");
  if (reason === "NO_DEBT") return new ApiError("No hay deuda pendiente para pagar.", 409, "NO_OUTSTANDING_DEBT");
  if (reason === "AMOUNT_MISMATCH") return new ApiError("El monto debe ser exactamente igual a la deuda pendiente.", 409, "PAYMENT_AMOUNT_MISMATCH", details);
  return new ApiError("La próxima fecha de cobro debe ser futura.", 400, "INVALID_NEXT_CHARGE_DATE");
};

export class PaymentsService {
  async getDashboard(actor: PaymentActorScope, filters: PaymentDashboardFilters = {}, now = new Date()) {
    const view = filters.view ?? "ALL";
    const query = filters.query?.trim() ?? "";
    const evaluationDate = normalizeToBuenosAiresDay(now);
    const { startDate, endDate } = getRollingThirtyDayWindow(evaluationDate);
    const [config, rawRows, collected] = await Promise.all([
      paymentsRepository.getGlobalPaymentConfig(),
      paymentsRepository.findDashboardRows({ actor, query }),
      paymentsRepository.getRollingCollectionSummary({ actor, query, startDate, endDateInclusive: toEndOfDayUtc(endDate) }),
    ]);
    const allRows = (rawRows as DashboardRowRecord[])
      .map((row) => mapDashboardRow(row, evaluationDate))
      .filter((row): row is PaymentDashboardRowDTO => row !== null);
    const debtRows = allRows.filter((row) => row.outstandingAmountInCents > 0);
    const overdueRows = debtRows.filter((row) => row.overdueSinceDate !== null);
    const estimatedRows = allRows.filter((row) => row.daysToExpire >= 0 && row.daysToExpire <= 29);
    return {
      evaluationDate,
      cards: {
        collectedCount: collected._count?._all ?? 0,
        collectedAmountInCents: collected._sum?.amountInCents ?? 0,
        outstandingCount: debtRows.length,
        outstandingAmountInCents: debtRows.reduce((sum, row) => sum + row.outstandingAmountInCents, 0),
        dueSoonCount: allRows.filter((row) => row.daysToExpire >= 0 && row.daysToExpire <= 3).length,
        overdueCount: overdueRows.length,
        overdueAmountInCents: overdueRows.reduce((sum, row) => sum + row.outstandingAmountInCents, 0),
        estimatedTotalInCents: estimatedRows.reduce((sum, row) => sum + row.monthlyAmountInCents, 0),
        studentsInEstimatedTotal: estimatedRows.length,
      },
      rows: allRows.filter((row) => matchesView(row, view)),
      config: { defaultMonthlyAmountInCents: config.defaultMonthlyAmountInCents, version: config.version, canEdit: actor.role === "ADMIN" },
      filters: { query, view },
    };
  }

  async registerPayment(actor: PaymentActorScope, input: RegisterPaymentInput) {
    this.validateCommand(input.studentProfileId, input.amountInCents, input.expectedCurrentPaymentVersion);
    const result = await paymentsRepository.registerPayment({ ...input, actor });
    if (!result.ok) throw commandError(result.reason, result.details);
    return result.value;
  }

  async editCurrentPayment(actor: PaymentActorScope, input: EditPaymentInput, now = new Date()) {
    this.validateCommand(input.studentProfileId, input.amountInCents, input.expectedCurrentPaymentVersion);
    const result = await paymentsRepository.editCurrentPayment({ ...input, actor, evaluationDate: now });
    if (!result.ok) throw commandError(result.reason, result.details);
    return result.value;
  }

  async getGlobalPaymentConfig() {
    return paymentsRepository.getGlobalPaymentConfig();
  }

  async updateGlobalPaymentConfig(actorId: string, amountInCents: number, expectedVersion: number) {
    if (!Number.isInteger(amountInCents) || amountInCents <= 0 || !Number.isInteger(expectedVersion) || expectedVersion <= 0) {
      throw new ApiError("La configuración de pagos no es válida", 400, "VALIDATION_ERROR");
    }
    const config = await paymentsRepository.updateGlobalPaymentConfig({ amountInCents, expectedVersion, actorId });
    if (!config) throw new ApiError("La configuración de pagos cambió. Actualice la vista e inténtelo nuevamente.", 409, "PAYMENT_CONFIG_CONFLICT");
    return config;
  }

  private validateCommand(studentProfileId: string, amountInCents: number, expectedVersion: number) {
    if (!studentProfileId || !Number.isInteger(amountInCents) || amountInCents <= 0 || !Number.isInteger(expectedVersion) || expectedVersion <= 0) {
      throw new ApiError("Los datos del pago no son válidos", 400, "VALIDATION_ERROR");
    }
  }
}

export const paymentsService = new PaymentsService();
