import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/http/api-response";

const { requireSessionMock, getUserByIdMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  getUserByIdMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/users/service", () => ({
  userService: {
    getUserById: getUserByIdMock,
  },
}));

import { GET } from "@/app/api/me/route";

describe("GET /api/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns current user payload for authenticated actor", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    getUserByIdMock.mockResolvedValue({ id: "admin-1", email: "admin@example.com" });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: { id: "admin-1", email: "admin@example.com" },
    });
    expect(getUserByIdMock).toHaveBeenCalledWith({ id: "admin-1", role: "ADMIN" }, "admin-1");
  });

  it("maps session guard failures to API error response", async () => {
    requireSessionMock.mockRejectedValue(new ApiError("Cuenta bloqueada", 403, "FORBIDDEN"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: {
        message: "Cuenta bloqueada",
        code: "FORBIDDEN",
      },
    });
  });
});
