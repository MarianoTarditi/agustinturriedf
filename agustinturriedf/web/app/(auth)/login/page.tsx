"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { AuthCard } from "../_components/auth-card";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const callbackUrl = useMemo(() => searchParams.get("callbackUrl") ?? "/dashboard", [searchParams]);

  const authErrorMessage = useMemo(() => {
    const error = searchParams.get("error");
    if (!error) return null;
    if (error === "CredentialsSignin") {
      return "Email o contraseña inválidos.";
    }

    return "No se pudo iniciar sesión. Intentá nuevamente.";
  }, [searchParams]);

  const formError = submitError ?? authErrorMessage;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (!result || result.error) {
      setSubmitting(false);
      setSubmitError("Email o contraseña inválidos.");
      return;
    }

    router.push(result.url ?? callbackUrl);
    router.refresh();
  };

  return (
    <AuthCard maxWidth={440}>
      <h1 className="auth-title" style={{ margin: 0, fontFamily: "var(--font-space-grotesk)", fontSize: "2.25rem", textTransform: "uppercase", letterSpacing: "-0.02em", textAlign: "center" }}>
        Acceso privado
      </h1>
      <p style={{ margin: "0.6rem 0 2rem", color: "var(--on-surface-variant)", opacity: 0.85, textAlign: "center" }}>Inicia sesión en AgustinTurriEDF</p>

      <form style={{ display: "grid", gap: "1rem" }} onSubmit={handleSubmit}>
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#deb7ff", fontWeight: 700 }}>Email</span>
          <input
            placeholder="tu@email.com"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            style={{ border: "none", outline: "none", borderRadius: 8, background: "var(--surface-high)", color: "var(--on-surface)", padding: "0.95rem 1rem" }}
          />
        </label>

        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#deb7ff", fontWeight: 700 }}>Password</span>
          <input
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            style={{ border: "none", outline: "none", borderRadius: 8, background: "var(--surface-high)", color: "var(--on-surface)", padding: "0.95rem 1rem" }}
          />
        </label>

        {formError ? (
          <p style={{ margin: 0, color: "#ffb3c7", fontSize: 13, lineHeight: 1.4 }}>{formError}</p>
        ) : null}

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

        <button
          type="submit"
          className="login-submit"
          disabled={submitting}
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
            border: "none",
            cursor: submitting ? "wait" : "pointer",
            opacity: submitting ? 0.85 : 1,
          }}
        >
          {submitting ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </AuthCard>
  );
}
