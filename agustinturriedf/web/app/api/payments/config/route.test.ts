import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, getTrainerDefaultAmountMock, updateTrainerDefaultAmountMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  getTrainerDefaultAmountMock: vi.fn(),
  updateTrainerDefaultAmountMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/payments/service", () => ({
  paymentsService: {
    getTrainerDefaultAmount: getTrainerDefaultAmountMock,
    updateTrainerDefaultAmount: updateTrainerDefaultAmountMock,
  },
}));

import { GET, PATCH } from "@/app/api/payments/config/route";

describe("/api/payments/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns current trainer config", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });
    getTrainerDefaultAmountMock.mockResolvedValue({ defaultMonthlyAmountInCents: 3_000_000 });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(getTrainerDefaultAmountMock).toHaveBeenCalledWith("trainer-1");
  });

  it("updates trainer config with valid payload", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });
    updateTrainerDefaultAmountMock.mockResolvedValue({ defaultMonthlyAmountInCents: 3_200_000 });

    const response = await PATCH(
      new Request("http://localhost/api/payments/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultMonthlyAmountInCents: 3_200_000 }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(updateTrainerDefaultAmountMock).toHaveBeenCalledWith("trainer-1", 3_200_000);
  });
});
