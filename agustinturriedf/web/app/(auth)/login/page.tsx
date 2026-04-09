import Link from "next/link";
import { AuthCard } from "../_components/auth-card";

export default function LoginPage() {
  return (
    <AuthCard maxWidth={440}>
      <h1 className="auth-title" style={{ margin: 0, fontFamily: "var(--font-space-grotesk)", fontSize: "2.25rem", textTransform: "uppercase", letterSpacing: "-0.02em", textAlign: "center" }}>
        Acceso privado
      </h1>
      <p style={{ margin: "0.6rem 0 2rem", color: "var(--on-surface-variant)", opacity: 0.85, textAlign: "center" }}>Inicia sesión en AgustinTurriEDF</p>

      <form style={{ display: "grid", gap: "1rem" }}>
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#deb7ff", fontWeight: 700 }}>Email</span>
          <input placeholder="tu@email.com" type="email" style={{ border: "none", outline: "none", borderRadius: 8, background: "var(--surface-high)", color: "var(--on-surface)", padding: "0.95rem 1rem" }} />
        </label>

        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#deb7ff", fontWeight: 700 }}>Password</span>
          <input placeholder="••••••••" type="password" style={{ border: "none", outline: "none", borderRadius: 8, background: "var(--surface-high)", color: "var(--on-surface)", padding: "0.95rem 1rem" }} />
        </label>

        <Link
          href="/reset-password"
          className="auth-secondary-link"
          style={{
            justifySelf: "start",
            marginTop: "-0.25rem",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          ¿Olvidaste tu contraseña?
        </Link>

        <Link
          href="/dashboard"
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
          }}
        >
          Ingresar
        </Link>
      </form>
    </AuthCard>
  );
}
