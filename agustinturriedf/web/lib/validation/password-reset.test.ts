import { describe, expect, it } from "vitest";

import {
  confirmPasswordResetSchema,
  passwordResetTokenQuerySchema,
  requestPasswordResetSchema,
} from "@/lib/validation/password-reset";

describe("password reset validation schemas", () => {
  it("accepts request payload with valid email", () => {
    const parsed = requestPasswordResetSchema.parse({ email: " USER@Example.com " });

    expect(parsed).toEqual({ email: "user@example.com" });
  });

  it("rejects request payload with invalid email", () => {
    expect(() => requestPasswordResetSchema.parse({ email: "not-an-email" })).toThrow();
  });

  it("accepts confirm payload with token and matching passwords", () => {
    const parsed = confirmPasswordResetSchema.parse({
      token: "token-123",
      password: "12345678",
      confirmPassword: "12345678",
    });

    expect(parsed).toEqual({
      token: "token-123",
      password: "12345678",
      confirmPassword: "12345678",
    });
  });

  it("rejects confirm payload when password has less than 8 chars", () => {
    expect(() =>
      confirmPasswordResetSchema.parse({
        token: "token-123",
        password: "1234567",
        confirmPassword: "1234567",
      })
    ).toThrow();
  });

  it("rejects confirm payload when confirmPassword does not match", () => {
    expect(() =>
      confirmPasswordResetSchema.parse({
        token: "token-123",
        password: "12345678",
        confirmPassword: "87654321",
      })
    ).toThrow();
  });

  it("rejects confirm payload when token is blank", () => {
    expect(() =>
      confirmPasswordResetSchema.parse({
        token: "   ",
        password: "12345678",
        confirmPassword: "12345678",
      })
    ).toThrow();
  });

  it("accepts query payload with required token", () => {
    const parsed = passwordResetTokenQuerySchema.parse({ token: "abc123" });

    expect(parsed).toEqual({ token: "abc123" });
  });

  it("rejects query payload without token", () => {
    expect(() => passwordResetTokenQuerySchema.parse({})).toThrow();
  });
});
