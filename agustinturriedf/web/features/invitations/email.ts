import { Resend } from "resend";

import { ApiError } from "@/lib/http/api-response";

type SendActivationEmailInput = {
  to: string;
  activationUrl: string;
  expiresAt: Date;
};

const ACTIVATION_SUBJECT = "Activá tu cuenta";

const formatExpiration = (value: Date) => value.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });

export const sendActivationEmail = async (input: SendActivationEmailInput) => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    throw new ApiError("Faltan variables de entorno para envío de emails", 500, "EMAIL_CONFIG_MISSING");
  }

  const resend = new Resend(apiKey);

  const result = await resend.emails.send({
    from,
    to: input.to,
    subject: ACTIVATION_SUBJECT,
    html: `<p>¡Hola!</p><p>Tu invitación está lista.</p><p><a href="${input.activationUrl}">Activar cuenta</a></p><p>Este enlace vence el ${formatExpiration(input.expiresAt)}.</p>`,
  });

  if (result.error) {
    throw new ApiError("No se pudo enviar el email de activación", 502, "EMAIL_DELIVERY_FAILED", result.error);
  }

  return {
    id: result.data?.id ?? null,
  };
};
