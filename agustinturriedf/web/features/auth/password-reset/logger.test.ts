import { afterEach, describe, expect, it, vi } from "vitest";

import { passwordResetLogger } from "@/features/auth/password-reset/logger";

describe("passwordResetLogger.logPasswordResetEmail", () => {
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("logs only the queued reset resource identifier", async () => {
    await passwordResetLogger.logPasswordResetEmail({
      userId: "user-1",
    });

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "password_reset_queued",
        userId: "user-1",
      })
    );
  });
});
