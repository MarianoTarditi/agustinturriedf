import { buildAuditEvent } from "@/features/audit/event-factory";
import { auditRepository } from "@/features/audit/repository";
import { evaluateEffectivePaymentDebt } from "@/features/payments/debt";
import { addDays, normalizeToBuenosAiresDay } from "@/features/payments/timezone";
import { prisma } from "@/lib/prisma";

const prismaPayments = prisma as any;

export const DEFAULT_MONTHLY_AMOUNT_IN_CENTS = 3_000_000;
export const GLOBAL_PAYMENT_CONFIG_ID = "GLOBAL";

export type PaymentDashboardView = "ALL" | "DUE_TODAY" | "DUE_THIS_WEEK" | "OVERDUE";
export type PaymentActorScope = { id: string; role: "ADMIN" | "TRAINER" };

export type FindDashboardRowsRepositoryInput = {
  actor: PaymentActorScope;
  query?: string;
};

type RegisterPaymentRepositoryInput = {
  actor: PaymentActorScope;
  studentProfileId: string;
  amountInCents: number;
  paymentDate: Date;
  expectedCurrentPaymentVersion: number;
};

type EditCurrentPaymentRepositoryInput = {
  actor: PaymentActorScope;
  studentProfileId: string;
  amountInCents: number;
  startDate: Date;
  evaluationDate: Date;
  expectedCurrentPaymentVersion: number;
};

type InitializeCurrentPaymentRepositoryInput = {
  studentProfileId: string;
  startDate: Date;
  transaction: any;
};

type RollingSummaryRepositoryInput = {
  actor: PaymentActorScope;
  query?: string;
  startDate: Date;
  endDateInclusive: Date;
};

export type PaymentCommandFailure = "NOT_FOUND" | "CONFLICT" | "NO_DEBT" | "AMOUNT_MISMATCH" | "INVALID_NEXT_CHARGE_DATE";
export type PaymentCommandResult<T> = { ok: true; value: T } | { ok: false; reason: PaymentCommandFailure; details?: Record<string, number> };

const buildSearchWhere = (query?: string) => {
  const normalizedQuery = query?.trim();
  if (!normalizedQuery) return {};
  return {
    OR: ["firstName", "lastName", "email"].map((field) => ({
      user: { [field]: { contains: normalizedQuery, mode: "insensitive" } },
    })),
  };
};

const buildScopeWhere = (actor: PaymentActorScope) =>
  actor.role === "TRAINER" ? { trainerId: actor.id } : {};

const appendPaymentAudit = async (
  transaction: any,
  actorId: string,
  eventType: string,
  currentPaymentId: string,
  changedFields: string[],
  cycleCount?: number
) => auditRepository.append(buildAuditEvent({
  eventType,
  actor: { type: "USER", userId: actorId },
  summary: {
    changedFields,
    resourceType: "CurrentPayment",
    resourceRef: currentPaymentId,
    ...(cycleCount === undefined ? {} : { cycleCount: String(cycleCount) }),
  },
}), transaction);

export class PaymentsRepository {
  async getGlobalPaymentConfig(transaction = prismaPayments) {
    return transaction.paymentConfig.findUniqueOrThrow({ where: { id: GLOBAL_PAYMENT_CONFIG_ID } });
  }

  async updateGlobalPaymentConfig(input: { amountInCents: number; expectedVersion: number; actorId: string }) {
    return prismaPayments.$transaction(async (transaction: any) => {
      const updated = await transaction.paymentConfig.updateMany({
        where: { id: GLOBAL_PAYMENT_CONFIG_ID, version: input.expectedVersion },
        data: { defaultMonthlyAmountInCents: input.amountInCents, version: { increment: 1 } },
      });
      if (updated.count !== 1) return null;
      const config = await this.getGlobalPaymentConfig(transaction);
      await auditRepository.append(buildAuditEvent({
        eventType: "PAYMENT_CONFIG_UPDATED",
        actor: { type: "USER", userId: input.actorId },
        summary: { changedFields: ["defaultMonthlyAmountInCents"], resourceType: "PaymentConfig", resourceRef: GLOBAL_PAYMENT_CONFIG_ID },
      }), transaction);
      return config;
    });
  }

  async initializeCurrentPaymentForStudent(input: InitializeCurrentPaymentRepositoryInput) {
    const config = await this.getGlobalPaymentConfig(input.transaction);
    const startDate = normalizeToBuenosAiresDay(input.startDate);
    const payment = await input.transaction.currentPayment.create({
      data: {
        studentProfileId: input.studentProfileId,
        amountInCents: config.defaultMonthlyAmountInCents,
        outstandingAmountInCents: config.defaultMonthlyAmountInCents,
        startDate,
        dueDate: addDays(startDate, 30),
        overdueSinceDate: null,
        version: 1,
      },
    });
    return payment;
  }

  async findDashboardRows(input: FindDashboardRowsRepositoryInput) {
    return prismaPayments.studentProfile.findMany({
      where: {
        ...buildScopeWhere(input.actor),
        user: { role: "STUDENT" },
        currentPayment: { isNot: null },
        ...buildSearchWhere(input.query),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        currentPayment: true,
      },
      orderBy: { currentPayment: { dueDate: "asc" } },
    });
  }

  async getRollingCollectionSummary(input: RollingSummaryRepositoryInput) {
    return prismaPayments.paymentHistory.aggregate({
      where: {
        paymentDate: { gte: input.startDate, lte: input.endDateInclusive },
        studentProfile: { ...buildScopeWhere(input.actor), ...buildSearchWhere(input.query) },
      },
      _count: { _all: true },
      _sum: { amountInCents: true },
    });
  }

  private async lockCurrentPayment(transaction: any, actor: PaymentActorScope, studentProfileId: string) {
    await transaction.$queryRaw`SELECT "id" FROM "CurrentPayment" WHERE "studentProfileId" = ${studentProfileId} FOR UPDATE`;
    return transaction.currentPayment.findFirst({
      where: { studentProfileId, studentProfile: buildScopeWhere(actor) },
    });
  }

  async registerPayment(input: RegisterPaymentRepositoryInput): Promise<PaymentCommandResult<any>> {
    return prismaPayments.$transaction(async (transaction: any) => {
      const currentPayment = await this.lockCurrentPayment(transaction, input.actor, input.studentProfileId);
      if (!currentPayment) return { ok: false, reason: "NOT_FOUND" };
      if (currentPayment.version !== input.expectedCurrentPaymentVersion) return { ok: false, reason: "CONFLICT" };

      const paymentDate = normalizeToBuenosAiresDay(input.paymentDate);
      const effective = evaluateEffectivePaymentDebt(currentPayment, paymentDate);
      if (effective.outstandingAmountInCents === 0) return { ok: false, reason: "NO_DEBT" };
      if (input.amountInCents !== effective.outstandingAmountInCents) {
        return { ok: false, reason: "AMOUNT_MISMATCH", details: {
          expectedAmountInCents: effective.outstandingAmountInCents,
          receivedAmountInCents: input.amountInCents,
        } };
      }

      const updatedCurrentPayment = await transaction.currentPayment.update({
        where: { id: currentPayment.id },
        data: {
          outstandingAmountInCents: 0,
          startDate: paymentDate,
          dueDate: addDays(paymentDate, 30),
          overdueSinceDate: null,
          version: { increment: 1 },
        },
      });
      const paymentHistory = await transaction.paymentHistory.create({
        data: {
          studentProfileId: input.studentProfileId,
          currentPaymentId: currentPayment.id,
          amountInCents: effective.outstandingAmountInCents,
          paymentDate,
          recordedByUserId: input.actor.id,
        },
      });
      if (effective.elapsedCycles > 0) {
        await appendPaymentAudit(transaction, input.actor.id, "PAYMENT_CYCLES_MATERIALIZED", currentPayment.id,
          ["outstandingAmountInCents", "dueDate", "overdueSinceDate"], effective.elapsedCycles);
      }
      await appendPaymentAudit(transaction, input.actor.id, "PAYMENT_RECORDED", currentPayment.id,
        ["outstandingAmountInCents", "startDate", "dueDate", "overdueSinceDate", "version"]);
      return { ok: true, value: { currentPayment: updatedCurrentPayment, paymentHistory } };
    });
  }

  async editCurrentPayment(input: EditCurrentPaymentRepositoryInput): Promise<PaymentCommandResult<any>> {
    return prismaPayments.$transaction(async (transaction: any) => {
      const currentPayment = await this.lockCurrentPayment(transaction, input.actor, input.studentProfileId);
      if (!currentPayment) return { ok: false, reason: "NOT_FOUND" };
      if (currentPayment.version !== input.expectedCurrentPaymentVersion) return { ok: false, reason: "CONFLICT" };

      const effective = evaluateEffectivePaymentDebt(currentPayment, input.evaluationDate);
      const startDate = normalizeToBuenosAiresDay(input.startDate);
      const dueDate = addDays(startDate, 30);
      if (dueDate.getTime() <= normalizeToBuenosAiresDay(input.evaluationDate).getTime()) {
        return { ok: false, reason: "INVALID_NEXT_CHARGE_DATE" };
      }
      const updated = await transaction.currentPayment.update({
        where: { id: currentPayment.id },
        data: {
          amountInCents: input.amountInCents,
          outstandingAmountInCents: effective.outstandingAmountInCents,
          startDate,
          dueDate,
          overdueSinceDate: effective.overdueSinceDate,
          version: { increment: 1 },
        },
      });
      if (effective.elapsedCycles > 0) {
        await appendPaymentAudit(transaction, input.actor.id, "PAYMENT_CYCLES_MATERIALIZED", currentPayment.id,
          ["outstandingAmountInCents", "dueDate", "overdueSinceDate"], effective.elapsedCycles);
      }
      await appendPaymentAudit(transaction, input.actor.id, "PAYMENT_CYCLE_UPDATED", currentPayment.id,
        ["amountInCents", "startDate", "dueDate", "version"]);
      return { ok: true, value: updated };
    });
  }
}

export const paymentsRepository = new PaymentsRepository();
