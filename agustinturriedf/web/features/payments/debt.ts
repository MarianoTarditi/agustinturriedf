import { addDays, calendarDaysBetween, normalizeToBuenosAiresDay } from "@/features/payments/timezone";

export type PaymentDebtState = {
  amountInCents: number;
  outstandingAmountInCents: number;
  dueDate: Date;
  overdueSinceDate: Date | null;
};

export type EffectivePaymentDebt = {
  outstandingAmountInCents: number;
  nextChargeDate: Date;
  overdueSinceDate: Date | null;
  elapsedCycles: number;
};

const checkedCents = (value: number) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("Payment debt exceeds the supported integer range");
  }
  return value;
};

export const evaluateEffectivePaymentDebt = (
  state: PaymentDebtState,
  evaluationDate: Date
): EffectivePaymentDebt => {
  checkedCents(state.amountInCents);
  checkedCents(state.outstandingAmountInCents);
  if (state.amountInCents === 0) throw new RangeError("Monthly payment amount must be positive");

  const dueDate = normalizeToBuenosAiresDay(state.dueDate);
  const evaluationDay = normalizeToBuenosAiresDay(evaluationDate);
  const daysFromBoundary = calendarDaysBetween(dueDate, evaluationDay);
  const elapsedCycles = daysFromBoundary < 0 ? 0 : 1 + Math.floor(daysFromBoundary / 30);
  const accrued = checkedCents(elapsedCycles * state.amountInCents);
  const outstandingAmountInCents = checkedCents(state.outstandingAmountInCents + accrued);
  const nextChargeDate = addDays(dueDate, elapsedCycles * 30);
  const overdueSinceDate = state.overdueSinceDate
    ? normalizeToBuenosAiresDay(state.overdueSinceDate)
    : elapsedCycles > 0 && state.outstandingAmountInCents > 0
      ? dueDate
      : elapsedCycles > 1
        ? addDays(dueDate, 30)
        : null;

  return { outstandingAmountInCents, nextChargeDate, overdueSinceDate, elapsedCycles };
};
