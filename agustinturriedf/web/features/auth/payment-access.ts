import { isOverdue } from "@/features/payments/timezone";
import { evaluateEffectivePaymentDebt, type PaymentDebtState } from "@/features/payments/debt";

export type PaymentStatus = "CURRENT" | "OVERDUE" | "NO_CYCLE";
export type AccessBlockReason = "ADMIN_INACTIVE" | "ADMIN_BLOCKED" | "PAYMENT_OVERDUE";
export type LegacyBlockedPolicy = "PRESERVE_AS_ADMIN_BLOCK" | "MAP_TO_ADMIN_INACTIVE";

type StudentStatus = "ACTIVE" | "INACTIVE" | "BLOCKED" | undefined;

export type PaymentAccessEvaluation = {
  paymentStatus: PaymentStatus;
  accessBlockReason?: AccessBlockReason;
  canAccess: boolean;
};

const resolveAdminBlockReason = (studentStatus: StudentStatus): AccessBlockReason | undefined => {
  const legacyBlockedPolicy: LegacyBlockedPolicy =
    process.env.PAYMENT_LEGACY_BLOCKED_POLICY === "MAP_TO_ADMIN_INACTIVE"
      ? "MAP_TO_ADMIN_INACTIVE"
      : "PRESERVE_AS_ADMIN_BLOCK";

  if (studentStatus === "INACTIVE") {
    return "ADMIN_INACTIVE";
  }

  if (studentStatus === "BLOCKED") {
    return legacyBlockedPolicy === "MAP_TO_ADMIN_INACTIVE" ? "ADMIN_INACTIVE" : "ADMIN_BLOCKED";
  }

  return undefined;
};

export const evaluatePaymentAccess = (input: {
  role: "ADMIN" | "TRAINER" | "STUDENT";
  studentStatus?: "ACTIVE" | "INACTIVE" | "BLOCKED";
  currentPaymentDueDate?: Date;
  currentPayment?: PaymentDebtState;
  now?: Date;
}): PaymentAccessEvaluation => {
  if (input.role !== "STUDENT") {
    return {
      paymentStatus: "CURRENT",
      canAccess: true,
    };
  }

  const adminBlockReason = resolveAdminBlockReason(input.studentStatus);

  const effectiveDebt = input.currentPayment &&
    Number.isSafeInteger(input.currentPayment.amountInCents) &&
    Number.isSafeInteger(input.currentPayment.outstandingAmountInCents)
    ? evaluateEffectivePaymentDebt(input.currentPayment, input.now ?? new Date())
    : null;
  const paymentStatus: PaymentStatus = effectiveDebt
    ? effectiveDebt.outstandingAmountInCents > 0 && effectiveDebt.overdueSinceDate !== null
      ? "OVERDUE"
      : "CURRENT"
    : input.currentPaymentDueDate
      ? isOverdue(input.currentPaymentDueDate, input.now)
        ? "OVERDUE"
        : "CURRENT"
      : "NO_CYCLE";

  if (adminBlockReason) {
    return {
      paymentStatus,
      accessBlockReason: adminBlockReason,
      canAccess: false,
    };
  }

  if (paymentStatus === "OVERDUE") {
    return {
      paymentStatus,
      accessBlockReason: "PAYMENT_OVERDUE",
      canAccess: false,
    };
  }

  return {
    paymentStatus,
    canAccess: true,
  };
};
