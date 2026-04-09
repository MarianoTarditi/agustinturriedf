import Link from "next/link";
import { AuthCard } from "../../_components/auth-card";

export default function ResetPasswordSentPage() {
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
        }}
      >
        Te enviamos un enlace a tu email
      </h1>
      <p style={{ margin: "0.85rem 0 2rem", color: "var(--on-surface-variant)", opacity: 0.9, lineHeight: 1.55 }}>
        Revisá tu bandeja de entrada y el correo no deseado para continuar con la recuperación del acceso.
      </p>

      <Link
        href="/login"
        className="login-submit"
        style={{
          marginTop: 10,
          display: "inline-flex",
          width: "100%",
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
        Volver al login
      </Link>
    </AuthCard>
  );
}
