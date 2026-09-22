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
      <form noValidate onSubmit={onSubmit}>
        <h2 id="activation-title">Elegí tu contraseña</h2>
        <p>Este paso es obligatorio para activar tu cuenta.</p>
        <ul id="password-requirements">
          <li>Mínimo 8 caracteres</li>
          <li>Una letra mayúscula</li>
          <li>Una letra minúscula</li>
          <li>Un número</li>
        </ul>
        <label>
          Contraseña
          <input
            aria-describedby={error ? "password-requirements password-feedback" : "password-requirements"}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </label>
        <label>
          Repetir contraseña
          <input
            aria-describedby={error ? "password-requirements password-feedback" : "password-requirements"}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
          />
        </label>
        {error ? <p id="password-feedback" role="alert">{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? "Activando..." : "Activar cuenta"}
        </button>
      </form>
    </section>
  );
}
