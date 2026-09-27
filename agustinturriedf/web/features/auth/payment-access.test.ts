import { describe, expect, it } from "vitest";

import { evaluatePaymentAccess } from "@/features/auth/payment-access";

describe("evaluatePaymentAccess", () => {
  it("keeps due-today student access allowed", () => {
    const result = evaluatePaymentAccess({
      role: "STUDENT",
      studentStatus: "ACTIVE",
      currentPaymentDueDate: new Date(),
      now: new Date(),
    });

    expect(result).toEqual({
      paymentStatus: "CURRENT",
      canAccess: true,
    });
  });

  it("blocks overdue student with payment reason", () => {
    const result = evaluatePaymentAccess({
      role: "STUDENT",
      studentStatus: "ACTIVE",
      currentPaymentDueDate: new Date("2020-01-01T00:00:00.000Z"),
      now: new Date("2026-04-21T00:00:00.000Z"),
    });

    expect(result).toEqual({
      paymentStatus: "OVERDUE",
      accessBlockReason: "PAYMENT_OVERDUE",
      canAccess: false,
    });
  });

  it("preserves legacy BLOCKED as admin block by default policy", () => {
    const result = evaluatePaymentAccess({
      role: "STUDENT",
      studentStatus: "BLOCKED",
      currentPaymentDueDate: new Date(),
      now: new Date(),
    });

    expect(result).toMatchObject({
      accessBlockReason: "ADMIN_BLOCKED",
      canAccess: false,
    });
  });
});
