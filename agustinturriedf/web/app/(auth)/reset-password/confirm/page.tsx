import { AuthCard } from "../../_components/auth-card";

import {
  INVALID_CONFIRM_TOKEN_MESSAGE,
  resolveConfirmTokenFromSearchParams,
} from "@/app/(auth)/reset-password/_components/reset-password-runtime";
import { ResetPasswordConfirmForm } from "@/app/(auth)/reset-password/_components/reset-password-confirm-form";

export default function ResetPasswordConfirmPage({
  searchParams,
}: {
  searchParams?: { token?: string | string[] | undefined };
}) {
  const invalidToken = resolveConfirmTokenFromSearchParams(searchParams ?? {});
  const token = invalidToken.token;

  return (
    <AuthCard>
      <h1
        className="auth-title"
        style={{
          margin: 0,
          fontFamily: "var(--font-space-grotesk)",
          fontSize: "2.15rem",
          textTransform: "uppercase",
          letterSpacing: "-0.02em",
          textAlign: "center",
        }}
      >
        Restablecé tu contraseña
      </h1>
      <p style={{ margin: "0.85rem 0 2rem", color: "var(--on-surface-variant)", opacity: 0.9, lineHeight: 1.55, textAlign: "center" }}>
        Ingresá una nueva contraseña para recuperar el acceso a tu cuenta.
      </p>

      {invalidToken.errorMessage || !token ? (
        <p role="alert" style={{ margin: 0, color: "#ffb3c7", fontSize: 13, lineHeight: 1.4 }}>
          {invalidToken.errorMessage ?? INVALID_CONFIRM_TOKEN_MESSAGE}
        </p>
      ) : (
        <ResetPasswordConfirmForm token={token} />
      )}
    </AuthCard>
  );
}
