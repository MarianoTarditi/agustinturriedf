import { describe, expect, it, vi } from "vitest";

import {
  buildRegisterWarningPayload,
  fetchPaymentConfigRuntime,
  runRegisterWarningDecision,
  shouldShowEarlyPaymentWarning,
  updatePaymentConfigRuntime,
} from "@/app/(private)/pagos/runtime";

describe("pagos runtime config", () => {
  it("fetches payment config", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          trainerId: "trainer-1",
          defaultMonthlyAmountInCents: 3_000_000,
        },
      }),
    });

    const config = await fetchPaymentConfigRuntime(fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments/config",
      expect.objectContaining({ method: "GET" })
    );
    expect(config.defaultMonthlyAmountInCents).toBe(3_000_000);
  });

  it("updates payment config", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          trainerId: "trainer-1",
          defaultMonthlyAmountInCents: 3_200_000,
        },
      }),
    });

    const config = await updatePaymentConfigRuntime(
      fetchMock as unknown as typeof fetch,
      {
        defaultMonthlyAmountInCents: 3_200_000,
      }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments/config",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(config.defaultMonthlyAmountInCents).toBe(3_200_000);
  });
});

describe("pagos runtime warning", () => {
  it("returns true only for CURRENT with more than 3 days to expire", () => {
    expect(
      shouldShowEarlyPaymentWarning({
        paymentStatus: "CURRENT",
        daysToExpire: 4,
      })
    ).toBe(true);

    expect(
      shouldShowEarlyPaymentWarning({
        paymentStatus: "CURRENT",
        daysToExpire: 3,
      })
    ).toBe(false);

    expect(
      shouldShowEarlyPaymentWarning({
        paymentStatus: "DUE_SOON",
        daysToExpire: 2,
      })
    ).toBe(false);

    expect(
      shouldShowEarlyPaymentWarning({
        paymentStatus: "OVERDUE",
        daysToExpire: -1,
      })
    ).toBe(false);
  });

  it("cancel warning => 0 calls to register runtime", async () => {
    const registerRuntimeMock = vi.fn().mockResolvedValue(undefined);
    const warningPayload = buildRegisterWarningPayload(
      {
        studentProfileId: "student-1",
        fullName: "Ada Lovelace",
        paymentStatus: "CURRENT",
        daysToExpire: 7,
      },
      {
        studentProfileId: "student-1",
        amountInCents: 3_000_000,
        paymentDate: "2026-04-23",
      }
    );

    const didSubmit = await runRegisterWarningDecision(
      {
        decision: "cancel",
        warningPayload,
      },
      registerRuntimeMock
    );

    expect(didSubmit).toBe(false);
    expect(registerRuntimeMock).toHaveBeenCalledTimes(0);
  });

  it("confirm warning => 1 call to register runtime with expected payload", async () => {
    const registerRuntimeMock = vi.fn().mockResolvedValue(undefined);
    const warningPayload = buildRegisterWarningPayload(
      {
        studentProfileId: "student-1",
        fullName: "Ada Lovelace",
        paymentStatus: "CURRENT",
        daysToExpire: 7,
      },
      {
        studentProfileId: "student-1",
        amountInCents: 3_000_000,
        paymentDate: "2026-04-23",
      }
    );

    const didSubmit = await runRegisterWarningDecision(
      {
        decision: "confirm",
        warningPayload,
      },
      registerRuntimeMock
    );

    expect(didSubmit).toBe(true);
    expect(registerRuntimeMock).toHaveBeenCalledTimes(1);
    expect(registerRuntimeMock).toHaveBeenCalledWith({
      studentProfileId: "student-1",
      amountInCents: 3_000_000,
      paymentDate: "2026-04-23",
    });
  });
});
