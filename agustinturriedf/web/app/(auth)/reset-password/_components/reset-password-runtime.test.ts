import { describe, expect, it, vi } from "vitest";

import {
  resolveConfirmTokenFromSearchParams,
  submitResetPasswordConfirm,
  submitResetPasswordRequest,
} from "@/app/(auth)/reset-password/_components/reset-password-runtime";

describe("reset-password runtime", () => {
  it("submits reset request and redirects to /reset-password/sent", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { message: "Si el email existe, te enviamos instrucciones." },
      }),
    });
    const routerPushMock = vi.fn();

    const result = await submitResetPasswordRequest({
      email: "user@example.com",
      fetchImpl: fetchMock,
      routerPush: routerPushMock,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/password-reset/request",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      })
    );
    expect(routerPushMock).toHaveBeenCalledWith("/reset-password/sent");
    expect(result).toEqual({ success: true, errorMessage: null });
  });

  it("keeps user on request screen and returns API error message", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
        },
      }),
    });
    const routerPushMock = vi.fn();

    const result = await submitResetPasswordRequest({
      email: "invalid-email",
      fetchImpl: fetchMock,
      routerPush: routerPushMock,
    });

    expect(routerPushMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, errorMessage: "Validation failed" });
  });

  it("returns confirm success state for valid token and password", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          message: "Contraseña actualizada.",
        },
      }),
    });

    const result = await submitResetPasswordConfirm({
      token: "valid-token",
      password: "12345678",
      confirmPassword: "12345678",
      fetchImpl: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/password-reset/confirm",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: "valid-token",
          password: "12345678",
          confirmPassword: "12345678",
        }),
      })
    );
    expect(result).toEqual({ success: true, errorMessage: null });
  });

  it("returns domain error for invalid or expired token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          message: "Token inválido o expirado",
          code: "INVALID_OR_EXPIRED_TOKEN",
        },
      }),
    });

    const result = await submitResetPasswordConfirm({
      token: "expired-token",
      password: "12345678",
      confirmPassword: "12345678",
      fetchImpl: fetchMock,
    });

    expect(result).toEqual({ success: false, errorMessage: "Token inválido o expirado" });
  });

  it("requires token in confirm search params", () => {
    const result = resolveConfirmTokenFromSearchParams({ token: "  " });

    expect(result).toEqual({
      token: null,
      errorMessage: "El enlace de recuperación no es válido o ya expiró.",
    });
  });

  it("returns normalized token when confirm search params are valid", () => {
    const result = resolveConfirmTokenFromSearchParams({ token: " valid-token " });

    expect(result).toEqual({
      token: "valid-token",
      errorMessage: null,
    });
  });
});
