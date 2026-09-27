import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/http/api-response";

const { requireSessionMock, listDirectoryMock, listUsersMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  listDirectoryMock: vi.fn(),
  listUsersMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/users/service", () => ({
  userService: {
    listDirectory: listDirectoryMock,
    listUsers: listUsersMock,
  },
}));

import { GET, POST } from "@/app/api/users/route";

describe("GET /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns users list for authorized actor", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });
    listUsersMock.mockResolvedValue([{ id: "u-1", email: "u1@example.com" }]);

    const response = await GET(new Request("http://localhost/api/users"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: [{ id: "u-1", email: "u1@example.com" }],
    });
    expect(listUsersMock).toHaveBeenCalledWith({ id: "trainer-1", role: "TRAINER" });
    expect(listDirectoryMock).not.toHaveBeenCalled();
  });

  it("returns 403 when blocked or forbidden actor hits endpoint", async () => {
    requireSessionMock.mockRejectedValue(new ApiError("Cuenta bloqueada", 403, "FORBIDDEN"));

    const response = await GET(new Request("http://localhost/api/users"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: {
        message: "Cuenta bloqueada",
        code: "FORBIDDEN",
      },
    });
    expect(listDirectoryMock).not.toHaveBeenCalled();
    expect(listUsersMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 405 and advertises GET as the only supported method", async () => {
    const response = await POST(new Request("http://localhost/api/users", { method: "POST" }));

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
  });
});
