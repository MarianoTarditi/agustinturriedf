import { describe, expect, it, vi } from "vitest";

const send = vi.fn().mockResolvedValue({ data: { id: "provider-1" } });

vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

import { sendOutboxEmail } from "./email-adapter";

describe("sendOutboxEmail", () => {
  it("renders PASSWORD_RESET delivery without invitation copy", async () => {
    process.env.RESEND_API_KEY = "synthetic-key";
    process.env.EMAIL_FROM = "support@example.com";

    await sendOutboxEmail({
      to: "user@example.com",
      activationUrl: "https://example.com/reset-password/confirm?token=raw-test-token",
      expiresAt: "2026-09-22T12:00:00.000Z",
      resourceType: "PASSWORD_RESET",
      idempotencyKey: "password-reset:user-1:1",
    });

    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      subject: "Restablecé tu contraseña",
      html: expect.stringContaining("Solicitaste restablecer tu contraseña."),
      idempotencyKey: "password-reset:user-1:1",
    }));
    expect(send.mock.calls[0]?.[0].html).not.toContain("Tu invitación está lista.");
  });
});
