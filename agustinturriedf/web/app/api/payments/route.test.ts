import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, getDashboardMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  getDashboardMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/payments/service", () => ({
  paymentsService: {
    getDashboard: getDashboardMock,
  },
}));

import { GET } from "@/app/api/payments/route";

describe("GET /api/payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns dashboard data for trainer", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });
    getDashboardMock.mockResolvedValue({ rows: [], cards: {}, config: {}, filters: {} });

    const request = new Request("http://localhost/api/payments?view=ALL&query=ana");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(getDashboardMock).toHaveBeenCalledWith("trainer-1", {
      view: "ALL",
      query: "ana",
    });
  });

  it("returns validation error for invalid view", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });

    const request = new Request("http://localhost/api/payments?view=INVALID");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
      },
    });
    expect(getDashboardMock).not.toHaveBeenCalled();
  });
});
