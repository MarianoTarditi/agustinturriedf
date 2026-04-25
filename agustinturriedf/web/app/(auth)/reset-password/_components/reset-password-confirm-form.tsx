"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { submitResetPasswordConfirm } from "@/app/(auth)/reset-password/_components/reset-password-runtime";

export function ResetPasswordConfirmForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting || isSuccess) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const result = await submitResetPasswordConfirm({
      token,
      password,
      confirmPassword,
      fetchImpl: fetch,
    });

    setSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.errorMessage);
      return;
    }

    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div style={{ display: "grid", gap: "1rem" }}>
        <p style={{ margin: 0, color: "var(--on-surface-variant)", lineHeight: 1.5 }}>
          Tu contraseña fue actualizada correctamente.
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
      </div>
    );
  }

  return (
    <form style={{ display: "grid", gap: "1rem" }} onSubmit={onSubmit}>
      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#deb7ff", fontWeight: 700 }}>
          Nueva contraseña
        </span>
        <input
          placeholder="••••••••"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="new-password"
          minLength={8}
          style={{ border: "none", outline: "none", borderRadius: 8, background: "var(--surface-high)", color: "var(--on-surface)", padding: "0.95rem 1rem" }}
        />
      </label>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#deb7ff", fontWeight: 700 }}>
          Confirmá tu contraseña
        </span>
        <input
          placeholder="••••••••"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          autoComplete="new-password"
          minLength={8}
          style={{ border: "none", outline: "none", borderRadius: 8, background: "var(--surface-high)", color: "var(--on-surface)", padding: "0.95rem 1rem" }}
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
        {submitting ? "Actualizando..." : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}
