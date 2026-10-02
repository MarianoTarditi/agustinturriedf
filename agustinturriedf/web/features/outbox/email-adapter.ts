import { Resend } from "resend";

type EmailPayload = { to: string; activationUrl: string; expiresAt: string; resourceType: string };

const formatExpiration = (value: Date) => value.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
})[character]!);

const formatInvitationExpiration = (value: Date) => `${new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeStyle: "short",
  hour12: false,
  timeZone: "America/Argentina/Buenos_Aires",
}).format(value)} (hora de Argentina)`;

const renderInvitationEmail = (activationUrl: string, expiresAt: string) => {
  const safeActivationUrl = escapeHtml(activationUrl);
  const expiration = formatInvitationExpiration(new Date(expiresAt));
  const safeExpiration = escapeHtml(expiration);

  return {
    html: `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#171717;color:#f7f2fa;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#171717;border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#242424;border-collapse:collapse;border:1px solid #3b3b3b;">
            <tr>
              <td style="padding:28px 32px 24px;border-bottom:4px solid #7b2cbf;">
                <p style="margin:0 0 6px;color:#deb7ff;font-size:22px;font-weight:700;line-height:1.25;letter-spacing:0.2px;">AgustinTurriEDF</p>
                <p style="margin:0;color:#d6d0da;font-size:12px;font-weight:700;line-height:1.5;letter-spacing:1.1px;">AGUSTÍN TURRI — ENTRENADOR DE FUERZA</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 18px;color:#ffffff;font-size:28px;font-weight:700;line-height:1.25;">Tu cuenta está lista para activar</h1>
                <p style="margin:0 0 16px;color:#e6e1e8;font-size:16px;line-height:1.6;">Recibiste una invitación para crear tu cuenta. Activala y elegí una contraseña segura para comenzar.</p>
                <p style="margin:0 0 24px;color:#e6e1e8;font-size:16px;line-height:1.6;">El enlace vence el <strong style="color:#ffffff;">${safeExpiration}</strong>.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin:0 0 28px;">
                  <tr>
                    <td align="center" bgcolor="#7b2cbf" style="background-color:#7b2cbf;">
                      <a href="${safeActivationUrl}" style="display:inline-block;padding:14px 24px;color:#ffffff;font-size:16px;font-weight:700;line-height:1.2;text-decoration:none;">Activar mi cuenta</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;color:#cfc8d3;font-size:14px;line-height:1.5;">Si el botón no funciona, copiá y pegá esta dirección en tu navegador:</p>
                <p style="margin:0 0 24px;color:#deb7ff;font-size:13px;line-height:1.6;word-break:break-all;overflow-wrap:anywhere;">${safeActivationUrl}</p>
                <p style="margin:0 0 8px;color:#cfc8d3;font-size:14px;line-height:1.5;">Si no esperabas esta invitación, podés ignorar este mensaje.</p>
                <p style="margin:0;color:#cfc8d3;font-size:14px;line-height:1.5;"><strong style="color:#ffffff;">No compartas este enlace:</strong> permite activar tu cuenta.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: `AgustinTurriEDF
AGUSTÍN TURRI — ENTRENADOR DE FUERZA

Tu cuenta está lista para activar

Recibiste una invitación para crear tu cuenta. Activala y elegí una contraseña segura para comenzar.

El enlace vence el ${expiration}.

Activar mi cuenta
Si el botón no funciona, copiá y pegá esta dirección en tu navegador:
${activationUrl}

Si no esperabas esta invitación, podés ignorar este mensaje.
No compartas este enlace: permite activar tu cuenta.`,
  };
};

export const sendOutboxEmail = async (input: EmailPayload & { idempotencyKey: string }) => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new Error("EMAIL_CONFIG_MISSING");

  const reset = input.resourceType === "PASSWORD_RESET";
  const invitation = reset ? null : renderInvitationEmail(input.activationUrl, input.expiresAt);
  const result = await new Resend(apiKey).emails.send({
    from,
    to: input.to,
    subject: reset ? "Restablecé tu contraseña" : "Activá tu cuenta | AgustinTurriEDF",
    html: reset
      ? `<p>¡Hola!</p><p>Solicitaste restablecer tu contraseña.</p><p><a href="${input.activationUrl}">Restablecer contraseña</a></p><p>Este enlace vence el ${formatExpiration(new Date(input.expiresAt))}.</p>`
      : invitation!.html,
    ...(invitation ? { text: invitation.text } : {}),
  }, { idempotencyKey: input.idempotencyKey });
  if (result.error) throw new Error("EMAIL_DELIVERY_FAILED");
  return { id: result.data?.id ?? null };
};
