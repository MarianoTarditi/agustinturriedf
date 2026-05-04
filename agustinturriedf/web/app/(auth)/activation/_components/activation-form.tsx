"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ActivationFormProps = {
  token: string;
};

export function ActivationForm({ token }: ActivationFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/activations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
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
    <form onSubmit={onSubmit}>
      <input type="hidden" value={token} readOnly name="token" />
      <label>
        Contraseña
        <input
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
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={8}
          required
        />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={loading}>
        {loading ? "Activando..." : "Activar cuenta"}
      </button>
    </form>
  );
}
