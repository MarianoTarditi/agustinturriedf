import { AuthCard } from "../_components/auth-card";

import { ActivationForm } from "@/app/(auth)/activation/_components/activation-form";

const resolveActivationToken = (token: string | string[] | undefined) => {
  if (!token) return null;
  if (Array.isArray(token)) return token[0] ?? null;
  return token.trim().length > 0 ? token.trim() : null;
};

export default function ActivationPage({
  searchParams,
}: {
  searchParams?: { token?: string | string[] | undefined };
}) {
  const token = resolveActivationToken(searchParams?.token);

  return (
    <AuthCard>
      <h1>Activá tu cuenta</h1>
      {!token ? (
        <p role="alert">El enlace de activación no es válido.</p>
      ) : (
        <ActivationForm token={token} />
      )}
    </AuthCard>
  );
}
