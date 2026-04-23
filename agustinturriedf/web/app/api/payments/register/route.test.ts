import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, registerPaymentMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  registerPaymentMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/payments/service", () => ({
  paymentsService: {
    registerPayment: registerPaymentMock,
  },
}));

import { POST } from "@/app/api/payments/register/route";

describe("POST /api/payments/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers payment when payload is valid", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });
    registerPaymentMock.mockResolvedValue({ currentPayment: { id: "cp-1" } });

    const request = new Request("http://localhost/api/payments/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentProfileId: "ck7m7x3k50000abcd1234efgh",
        amountInCents: 3_000_000,
        paymentDate: "2026-04-21",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(registerPaymentMock).toHaveBeenCalledWith(
      "trainer-1",
      "trainer-1",
      expect.objectContaining({
        studentProfileId: "ck7m7x3k50000abcd1234efgh",
        amountInCents: 3_000_000,
      })
    );
  });
});
