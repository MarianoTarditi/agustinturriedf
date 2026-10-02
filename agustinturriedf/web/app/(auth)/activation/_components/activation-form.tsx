"use client";

import { useState } from "react";
import React from "react";
import { useRouter } from "next/navigation";

const passwordPolicyError = (password: string) => {
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return "La contraseña debe cumplir todos los requisitos indicados.";
  }

  return null;
};

export function ActivationForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = passwordPolicyError(password) || (password !== confirmPassword ? "Las contraseñas no coinciden." : null);

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/activations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
      });

      const payload = (await response.json()) as
        | { success: true; data: { message: string } }
        | { success: false; error: { message: string } };

      if (!response.ok || !payload.success) {
        const message = payload.success ? "No se pudo activar la cuenta." : payload.error.message;
        setError(message);
        return;
      }

      router.push("/activation/confirm");
    } catch {
      setError("No se pudo activar la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-labelledby="activation-title" aria-modal="true" role="dialog">
      <h2 id="activation-title" style={{ margin: "0.6rem 0 0", color: "var(--on-surface-variant)", opacity: 0.85, textAlign: "center", fontSize: "1rem", fontWeight: 400 }}>Elegí tu contraseña</h2>
      <p style={{ margin: "0.6rem 0 2rem", color: "var(--on-surface-variant)", opacity: 0.85, textAlign: "center" }}>Este paso es obligatorio para activar tu cuenta.</p>
      <form noValidate onSubmit={onSubmit} style={{ display: "grid", gap: "1rem" }}>
        <ul id="password-requirements" style={{ margin: 0, padding: "0.95rem 1rem 0.95rem 2rem", borderRadius: 8, background: "var(--surface-high)", color: "var(--on-surface-variant)", fontSize: 13, lineHeight: 1.55 }}>
          <li>Mínimo 8 caracteres</li>
          <li>Una letra mayúscula</li>
          <li>Una letra minúscula</li>
          <li>Un número</li>
        </ul>
        <label style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#deb7ff", fontWeight: 700 }}>Contraseña</span>
          <input
            aria-describedby={error ? "password-requirements password-feedback" : "password-requirements"}
            type="password"
            autoComplete="new-password"
            style={{ width: "100%", minWidth: 0, border: "none", borderRadius: 8, background: "var(--surface-high)", color: "var(--on-surface)", padding: "0.95rem 1rem", outlineOffset: 3 }}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </label>
        <label style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#deb7ff", fontWeight: 700 }}>Repetir contraseña</span>
          <input
            aria-describedby={error ? "password-requirements password-feedback" : "password-requirements"}
            type="password"
            autoComplete="new-password"
            style={{ width: "100%", minWidth: 0, border: "none", borderRadius: 8, background: "var(--surface-high)", color: "var(--on-surface)", padding: "0.95rem 1rem", outlineOffset: 3 }}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
          />
        </label>
        {error ? <p id="password-feedback" role="alert" style={{ margin: 0, color: "#ffb3c7", fontSize: 13, lineHeight: 1.4 }}>{error}</p> : null}
        <button type="submit" disabled={loading} className="login-submit" style={{ marginTop: 10, display: "inline-flex", justifyContent: "center", alignItems: "center", borderRadius: 8, color: "#e4c2ff", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, fontFamily: "var(--font-space-grotesk)", padding: "0.95rem 1rem", background: "linear-gradient(90deg, #7b2cbf 0%, #680eac 100%)", border: "none", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.65 : 1, outlineOffset: 3 }}>
          {loading ? "Activando..." : "Activar cuenta"}
        </button>
      </form>
    </section>
  );
}
