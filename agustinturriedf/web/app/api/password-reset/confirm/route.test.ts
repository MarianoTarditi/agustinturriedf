import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/http/api-response";

const { confirmResetMock } = vi.hoisted(() => ({
  confirmResetMock: vi.fn(),
}));

vi.mock("@/features/auth/password-reset/service", () => ({
  passwordResetService: {
    confirmReset: confirmResetMock,
  },
}));

import { PASSWORD_RESET_CONFIRM_SUCCESS_MESSAGE, POST } from "@/app/api/password-reset/confirm/route";

describe("POST /api/password-reset/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when token and password are valid", async () => {
    confirmResetMock.mockResolvedValue({ message: "ignored" });

    const request = new Request("http://localhost/api/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "valid-token",
        password: "12345678",
        confirmPassword: "12345678",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        message: PASSWORD_RESET_CONFIRM_SUCCESS_MESSAGE,
      },
    });
    expect(confirmResetMock).toHaveBeenCalledWith({
      token: "valid-token",
      password: "12345678",
    });
  });

  it("returns 400 validation error when payload is invalid", async () => {
    const request = new Request("http://localhost/api/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "",
        password: "1234",
        confirmPassword: "12345678",
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
    expect(confirmResetMock).not.toHaveBeenCalled();
  });

  it("maps invalid or expired token to 400 domain error", async () => {
    confirmResetMock.mockRejectedValue(new ApiError("Token inválido o expirado", 400, "INVALID_OR_EXPIRED_TOKEN"));

    const request = new Request("http://localhost/api/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "invalid-token",
        password: "12345678",
        confirmPassword: "12345678",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: {
        message: "Token inválido o expirado",
        code: "INVALID_OR_EXPIRED_TOKEN",
      },
    });
  });
});
