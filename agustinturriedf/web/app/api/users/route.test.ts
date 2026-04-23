import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/http/api-response";

const { requireSessionMock, listUsersMock, createUserMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  listUsersMock: vi.fn(),
  createUserMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/users/service", () => ({
  userService: {
    listUsers: listUsersMock,
    createUser: createUserMock,
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

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: [{ id: "u-1", email: "u1@example.com" }],
    });
    expect(listUsersMock).toHaveBeenCalledWith({ id: "trainer-1", role: "TRAINER" });
  });

  it("returns 403 when blocked or forbidden actor hits endpoint", async () => {
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
    expect(listUsersMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when payload fails Zod validation", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    const request = new Request("http://localhost/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
      },
    });
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("returns 400 when STUDENT payload omits initialPaymentStartDate", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    const request = new Request("http://localhost/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Ana",
        lastName: "Gomez",
        email: "ana@example.com",
        phone: "+54 9 11 1111 1111",
        role: "STUDENT",
        trainerId: "cm1111111111111111111111",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
      },
    });
    expect(createUserMock).not.toHaveBeenCalled();
  });
});
