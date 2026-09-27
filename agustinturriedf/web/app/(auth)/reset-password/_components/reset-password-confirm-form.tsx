"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { submitResetPasswordConfirm } from "@/app/(auth)/reset-password/_components/reset-password-runtime";
import { useLoading } from "@/components/use-loading";
import { useToast } from "@/components/use-toast";

export function ResetPasswordConfirmForm({ token }: { token: string }) {
  const { showLoader, hideLoader } = useLoading();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSuccess) {
      return;
    }

    showLoader("auth-reset-confirm", { text: "Actualizando contraseña…" });
    setIsSubmitting(true);

    const result = await submitResetPasswordConfirm({
      token,
      password,
      confirmPassword,
      fetchImpl: fetch,
    });

    setIsSubmitting(false);
    hideLoader("auth-reset-confirm");

    if (!result.success) {
      showToast('error', result.errorMessage ?? 'Ocurrió un error');
      return;
    }

    showToast('success', 'Contraseña actualizada correctamente.');
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

      

      <button
        type="submit"
        className="login-submit"
        disabled={isSubmitting}
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
          cursor: isSubmitting ? "wait" : "pointer",
          opacity: isSubmitting ? 0.85 : 1,
        }}
      >
        {isSubmitting ? "Actualizando..." : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}
