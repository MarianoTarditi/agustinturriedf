import { AuthCard } from "../_components/auth-card";
import { ResetPasswordRequestForm } from "@/app/(auth)/reset-password/_components/reset-password-request-form";

export default function ResetPasswordPage() {
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
        ¿Olvidaste tu contraseña?
      </h1>
      <p style={{ margin: "0.85rem 0 2rem", color: "var(--on-surface-variant)", opacity: 0.9, lineHeight: 1.55, textAlign: "center" }}>
        Ingresá tu email y te vamos a enviar un link para recuperar el acceso a tu cuenta.
      </p>

      <ResetPasswordRequestForm />
    </AuthCard>
  );
}
