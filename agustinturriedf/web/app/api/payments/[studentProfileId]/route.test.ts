import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, editCurrentPaymentMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  editCurrentPaymentMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/payments/service", () => ({
  paymentsService: {
    editCurrentPayment: editCurrentPaymentMock,
  },
}));

import { PATCH } from "@/app/api/payments/[studentProfileId]/route";

describe("PATCH /api/payments/[studentProfileId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("edits current payment when payload is valid", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });
    editCurrentPaymentMock.mockResolvedValue({ id: "cp-1" });

    const request = new Request("http://localhost/api/payments/ck7m7x3k50000abcd1234efgh", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountInCents: 2_900_000,
        startDate: "2026-04-21",
      }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({
        studentProfileId: "ck7m7x3k50000abcd1234efgh",
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(editCurrentPaymentMock).toHaveBeenCalledWith(
      "trainer-1",
      expect.objectContaining({
        studentProfileId: "ck7m7x3k50000abcd1234efgh",
        amountInCents: 2_900_000,
      })
    );
  });
});
