import { beforeEach, describe, expect, it, vi } from "vitest";

const { send, resendClassMock } = vi.hoisted(() => {
  const send = vi.fn();

  class ResendMock {
    emails = { send };
  }

  return { send, resendClassMock: ResendMock };
});

vi.mock("resend", () => ({
  Resend: resendClassMock,
}));

import { sendOutboxEmail } from "./email-adapter";

describe("sendOutboxEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "synthetic-key";
    process.env.EMAIL_FROM = "AgustinTurriEDF <support@example.com>";
    send.mockResolvedValue({ data: { id: "provider-1" }, error: null });
  });

  it("sends a branded invitation with matching HTML and plain-text guidance", async () => {
    const activationUrl = "https://example.com/activation/exchange?token=raw-test-token";

    await sendOutboxEmail({
      to: "user@example.com",
      activationUrl,
      expiresAt: "2026-09-22T12:00:00.000Z",
      resourceType: "INVITATION",
      idempotencyKey: "invitation:user-1:1",
    });

    const [message, options] = send.mock.calls[0] ?? [];
    expect(message).toEqual(expect.objectContaining({
      from: "AgustinTurriEDF <support@example.com>",
      to: "user@example.com",
      subject: "Activá tu cuenta | AgustinTurriEDF",
      html: expect.any(String),
      text: expect.any(String),
    }));
    expect(message).not.toHaveProperty("idempotencyKey");
    expect(options).toEqual({ idempotencyKey: "invitation:user-1:1" });
    for (const copy of [
      "AgustinTurriEDF",
      "AGUSTÍN TURRI — ENTRENADOR DE FUERZA",
      "Tu cuenta está lista para activar",
      "Activar mi cuenta",
      "contraseña segura",
      "Si el botón no funciona, copiá y pegá esta dirección en tu navegador:",
      "Si no esperabas esta invitación",
      "No compartas este enlace",
    ]) {
      expect(message.html).toContain(copy);
      expect(message.text).toContain(copy);
    }
    expect(message.html).toContain("22 de septiembre de 2026, 09:00 (hora de Argentina)");
    expect(message.text).toContain("22 de septiembre de 2026, 09:00 (hora de Argentina)");
  });

  it("preserves and safely escapes the exact activation URL without tracking or reconstruction", async () => {
    const activationUrl = "https://example.com/activation/exchange?token=\"><img src=x onerror=alert(1)>&next='hostile'";

    await sendOutboxEmail({
      to: "user@example.com",
      activationUrl,
      expiresAt: "2026-09-22T12:00:00.000Z",
      resourceType: "INVITATION",
      idempotencyKey: "invitation:user-1:hostile",
    });

    const { html, text } = send.mock.calls[0]?.[0];
    const decodeHtml = (value: string) => value
      .replaceAll("&quot;", "\"")
      .replaceAll("&#39;", "'")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&amp;", "&");
    const href = html.match(/href="([^"]*)"/)?.[1];
    const fallback = html.match(/overflow-wrap:anywhere;">([^<]+)<\/p>/)?.[1];

    expect(href && decodeHtml(href)).toBe(activationUrl);
    expect(fallback && decodeHtml(fallback)).toBe(activationUrl);
    expect(text.split("\n")).toContain(activationUrl);
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).toContain("&quot;&gt;&lt;img src=x onerror=alert(1)&gt;&amp;next=&#39;hostile&#39;");
    expect((decodeHtml(html).match(/raw-test-token/g) ?? [])).toHaveLength(0);
    expect((decodeHtml(html).match(/token=/g) ?? [])).toHaveLength(2);
    expect((text.match(/token=/g) ?? [])).toHaveLength(1);
    expect(html).not.toMatch(/utm_|tracking|pixel/i);
    expect(text).not.toMatch(/utm_|tracking|pixel/i);
  });

  it("renders PASSWORD_RESET delivery without invitation copy", async () => {
    await sendOutboxEmail({
      to: "user@example.com",
      activationUrl: "https://example.com/reset-password/confirm?token=raw-test-token",
      expiresAt: "2026-09-22T12:00:00.000Z",
      resourceType: "PASSWORD_RESET",
      idempotencyKey: "password-reset:user-1:1",
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Restablecé tu contraseña",
        html: expect.stringContaining("Solicitaste restablecer tu contraseña."),
      }),
      { idempotencyKey: "password-reset:user-1:1" },
    );
    const [message] = send.mock.calls[0] ?? [];
    expect(message).not.toHaveProperty("idempotencyKey");
    expect(message.html).toBe("<p>¡Hola!</p><p>Solicitaste restablecer tu contraseña.</p><p><a href=\"https://example.com/reset-password/confirm?token=raw-test-token\">Restablecer contraseña</a></p><p>Este enlace vence el 22/9/2026, 09:00:00.</p>");
    expect(message).not.toHaveProperty("text");
    expect(message.html).not.toContain("Tu cuenta está lista para activar");
  });
});
