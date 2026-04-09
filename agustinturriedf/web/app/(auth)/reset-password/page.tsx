import Link from "next/link";
import { AuthCard } from "../_components/auth-card";

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

      <form style={{ display: "grid", gap: "1rem" }}>
        <label style={{ display: "grid", gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#deb7ff",
              fontWeight: 700,
            }}
          >
            Email
          </span>
          <input
            placeholder="tu@email.com"
            type="email"
            style={{
              border: "none",
              outline: "none",
              borderRadius: 8,
              background: "var(--surface-high)",
              color: "var(--on-surface)",
              padding: "0.95rem 1rem",
            }}
          />
        </label>

        <Link
          href="/reset-password/sent"
          className="login-submit"
          style={{
            marginTop: 10,
            display: "inline-flex",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: 8,
            color: "#e4c2ff",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontWeight: 700,
            fontFamily: "var(--font-space-grotesk)",
            padding: "0.95rem 1rem",
            background: "linear-gradient(90deg, #7b2cbf 0%, #680eac 100%)",
            textDecoration: "none",
          }}
        >
          Reestablecer contraseña
        </Link>

        <Link
          href="/login"
          className="auth-secondary-link"
          style={{
            justifySelf: "center",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.04em",
            marginTop: "0.35rem",
          }}
        >
          Volver al login
        </Link>
      </form>
    </AuthCard>
  );
}
