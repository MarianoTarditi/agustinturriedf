import { Resend } from "resend";

type EmailPayload = { to: string; activationUrl: string; expiresAt: string };

const formatExpiration = (value: Date) => value.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });

export const sendOutboxEmail = async (input: EmailPayload & { idempotencyKey: string }) => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new Error("EMAIL_CONFIG_MISSING");

  const result = await new Resend(apiKey).emails.send({
    from,
    to: input.to,
    subject: "Activá tu cuenta",
    html: `<p>¡Hola!</p><p>Tu invitación está lista.</p><p><a href="${input.activationUrl}">Activar cuenta</a></p><p>Este enlace vence el ${formatExpiration(new Date(input.expiresAt))}.</p>`,
    idempotencyKey: input.idempotencyKey,
  } as never);
  if (result.error) throw new Error("EMAIL_DELIVERY_FAILED");
  return { id: result.data?.id ?? null };
};
