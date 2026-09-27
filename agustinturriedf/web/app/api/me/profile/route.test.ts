import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/http/api-response";

const { requireSessionMock, getOwnProfileMock, updateOwnProfileMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  getOwnProfileMock: vi.fn(),
  updateOwnProfileMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/users/service", () => ({
  userService: {
    getOwnProfile: getOwnProfileMock,
    updateOwnProfile: updateOwnProfileMock,
  },
}));

import { GET, PATCH } from "@/app/api/me/profile/route";

describe("GET /api/me/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns own profile for authenticated actor", async () => {
    requireSessionMock.mockResolvedValue({ id: "user-1", role: "STUDENT" });
    getOwnProfileMock.mockResolvedValue({
      firstName: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      phone: null,
      photoUrl: null,
      birthDate: null,
      gender: null,
      heightCm: null,
      weightKg: null,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        firstName: "Ana",
        lastName: "Pérez",
        email: "ana@example.com",
        phone: null,
        photoUrl: null,
        birthDate: null,
        gender: null,
        heightCm: null,
        weightKg: null,
      },
    });
    expect(getOwnProfileMock).toHaveBeenCalledWith("user-1");
  });

  it("maps auth/session failures to API error responses", async () => {
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
    expect(getOwnProfileMock).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/me/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates own profile and ignores immutable fields from payload", async () => {
    requireSessionMock.mockResolvedValue({ id: "user-1", role: "STUDENT" });
    updateOwnProfileMock.mockResolvedValue({
      firstName: "Ana María",
      lastName: "Pérez",
      email: "ana@example.com",
      phone: "+54 11 4444-4444",
      photoUrl: "https://cdn.example.com/ana.jpg",
      birthDate: "2000-01-02",
      gender: "FEMALE",
      heightCm: 170,
      weightKg: 63,
    });

    const request = new Request("http://localhost/api/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "other-user",
        email: "hacker@example.com",
        role: "ADMIN",
        firstName: "  Ana María  ",
        phone: "  +54 11 4444-4444  ",
        photoUrl: "https://cdn.example.com/ana.jpg",
        birthDate: "2000-01-02",
        gender: "FEMALE",
        heightCm: 170,
        weightKg: 63,
      }),
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updateOwnProfileMock).toHaveBeenCalledWith("user-1", {
      firstName: "Ana María",
      phone: "+54 11 4444-4444",
      photoUrl: "https://cdn.example.com/ana.jpg",
      birthDate: "2000-01-02",
      gender: "FEMALE",
      heightCm: 170,
      weightKg: 63,
    });
    expect(body).toMatchObject({
      success: true,
      data: {
        firstName: "Ana María",
        email: "ana@example.com",
      },
    });
  });

  it("returns 400 when payload has no mutable valid fields", async () => {
    requireSessionMock.mockResolvedValue({ id: "user-1", role: "STUDENT" });

    const request = new Request("http://localhost/api/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "hacker@example.com", role: "ADMIN", id: "other-user" }),
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
      },
    });
    expect(updateOwnProfileMock).not.toHaveBeenCalled();
  });
});
