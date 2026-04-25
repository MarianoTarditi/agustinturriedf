import { afterEach, describe, expect, it, vi } from "vitest";

import { passwordResetLogger } from "@/features/auth/password-reset/logger";

describe("passwordResetLogger.logPasswordResetEmail", () => {
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("logs the simulated email payload with structured fields", async () => {
    const expiresAt = new Date("2026-04-23T16:00:00.000Z");

    await passwordResetLogger.logPasswordResetEmail({
      email: "user@example.com",
      resetUrl: "http://localhost:3010/reset-password/confirm?token=raw-token",
      expiresAt,
    });

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "password_reset_requested",
        email: "user@example.com",
        resetUrl: "http://localhost:3010/reset-password/confirm?token=raw-token",
        expiresAt,
      })
    );
  });
});
