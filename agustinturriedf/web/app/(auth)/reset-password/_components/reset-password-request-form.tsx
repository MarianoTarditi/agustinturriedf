"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { submitResetPasswordRequest } from "@/app/(auth)/reset-password/_components/reset-password-runtime";

export function ResetPasswordRequestForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const result = await submitResetPasswordRequest({
      email,
      fetchImpl: fetch,
      routerPush: router.push,
    });

    if (!result.success) {
      setSubmitting(false);
      setErrorMessage(result.errorMessage);
    }
  };

  return (
    <form style={{ display: "grid", gap: "1rem" }} onSubmit={onSubmit}>
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
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
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

      {errorMessage ? (
        <p role="alert" style={{ margin: 0, color: "#ffb3c7", fontSize: 13, lineHeight: 1.4 }}>
          {errorMessage}
        </p>
      ) : null}

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
        {submitting ? "Enviando..." : "Reestablecer contraseña"}
      </button>

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
  );
}
