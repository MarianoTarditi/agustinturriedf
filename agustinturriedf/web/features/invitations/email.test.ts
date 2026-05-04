import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock, resendConstructorSpy, resendClassMock } = vi.hoisted(() => {
  const sendMock = vi.fn();
  const resendConstructorSpy = vi.fn();

  class ResendMock {
    emails = {
      send: sendMock,
    };

    constructor(apiKey: string) {
      resendConstructorSpy(apiKey);
    }
  }

  return {
    sendMock,
    resendConstructorSpy,
    resendClassMock: ResendMock,
  };
});

vi.mock("resend", () => ({
  Resend: resendClassMock,
}));

import { sendActivationEmail } from "@/features/invitations/email";

describe("sendActivationEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Equipo <onboarding@example.com>";
    sendMock.mockResolvedValue({
      data: { id: "email_1" },
      error: null,
    });
  });

  it("sends activation email through Resend with expected params", async () => {
    await sendActivationEmail({
      to: "student@example.com",
      activationUrl: "http://localhost:3010/activation?token=abc",
      expiresAt: new Date("2026-05-01T10:00:00.000Z"),
    });

    expect(resendConstructorSpy).toHaveBeenCalledWith("re_test_key");
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Equipo <onboarding@example.com>",
        to: "student@example.com",
        subject: "Activá tu cuenta",
      })
    );
  });

  it("throws when resend returns error", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "provider-down" },
    });

    await expect(
      sendActivationEmail({
        to: "student@example.com",
        activationUrl: "http://localhost:3010/activation?token=abc",
        expiresAt: new Date("2026-05-01T10:00:00.000Z"),
      })
    ).rejects.toThrow("No se pudo enviar el email de activación");
  });
});
