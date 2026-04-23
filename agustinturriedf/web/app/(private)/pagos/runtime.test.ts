import { describe, expect, it, vi } from "vitest";

import {
  fetchPaymentConfigRuntime,
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
