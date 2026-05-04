"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { submitResetPasswordRequest } from "@/app/(auth)/reset-password/_components/reset-password-runtime";
import { useLoading } from "@/components/use-loading";
import { useToast } from "@/components/use-toast";

export function ResetPasswordRequestForm() {
  const router = useRouter();
  const { showLoader, hideLoader } = useLoading();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    showLoader("auth-reset-request", { text: "Enviando solicitud de recuperación…" });

    try {
      const result = await submitResetPasswordRequest({
        email,
        fetchImpl: fetch,
        routerPush: router.push,
        onBeforeNavigate: () => hideLoader("auth-reset-request"),
      });

      if (!result.success) {
        showToast('error', result.errorMessage ?? 'Ocurrió un error');
        return;
      }

      showToast('success', 'Revisá tu email para reestablecer la contraseña.');
    } finally {
      hideLoader("auth-reset-request");
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

      

      <button
        type="submit"
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
          border: "none",
          cursor: "pointer",
        }}
      >
        Reestablecer contraseña
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
