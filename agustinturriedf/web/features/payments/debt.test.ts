import { describe, expect, it } from "vitest";

import { evaluateEffectivePaymentDebt } from "@/features/payments/debt";
import { parseBuenosAiresDateInput } from "@/features/payments/timezone";

const day = parseBuenosAiresDateInput;
const state = (outstandingAmountInCents: number) => ({
  amountInCents: 3_000_000,
  outstandingAmountInCents,
  dueDate: day("2026-05-31"),
  overdueSinceDate: null,
});

describe("evaluateEffectivePaymentDebt", () => {
  it.each([
    ["2026-05-30", 3_000_000, "2026-05-31", null, 0],
    ["2026-05-31", 6_000_000, "2026-06-30", "2026-05-31", 1],
    ["2026-07-01", 9_000_000, "2026-07-30", "2026-05-31", 2],
  ])("derives crossed boundaries at %s", (evaluation, amount, next, overdue, cycles) => {
    const result = evaluateEffectivePaymentDebt(state(3_000_000), day(evaluation));
    expect(result.outstandingAmountInCents).toBe(amount);
    expect(result.nextChargeDate).toEqual(day(next));
    expect(result.overdueSinceDate).toEqual(overdue ? day(overdue) : null);
    expect(result.elapsedCycles).toBe(cycles);
  });

  it("does not mark the first charge after a zero balance overdue", () => {
    const first = evaluateEffectivePaymentDebt(state(0), day("2026-05-31"));
    const second = evaluateEffectivePaymentDebt(state(0), day("2026-06-30"));
    expect(first).toMatchObject({ outstandingAmountInCents: 3_000_000, overdueSinceDate: null });
    expect(second.outstandingAmountInCents).toBe(6_000_000);
    expect(second.overdueSinceDate).toEqual(day("2026-06-30"));
  });

  it("rejects unsafe integer overflow", () => {
    expect(() => evaluateEffectivePaymentDebt({ ...state(Number.MAX_SAFE_INTEGER), amountInCents: 1 }, day("2026-05-31")))
      .toThrow(RangeError);
  });
});
