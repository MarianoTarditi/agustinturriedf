import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

import { AuthCard } from "../_components/auth-card";

import { ActivationForm } from "@/app/(auth)/activation/_components/activation-form";

export default async function ActivationPage({ searchParams }: { searchParams: Promise<{ token?: string | string[]; recovery?: string | string[] }> }) {
  const params = await searchParams;
  const token = (Array.isArray(params.token) ? params.token[0] : params.token)?.trim();
  if (token) redirect(`/activation/exchange?token=${encodeURIComponent(token)}`);

  const session = (await cookies()).get("activation_session")?.value;
  const recovery = (Array.isArray(params.recovery) ? params.recovery[0] : params.recovery) === "1";

  return (
    <AuthCard maxWidth={440}>
      <h1 className="auth-title" style={{ margin: 0, fontFamily: "var(--font-space-grotesk)", fontSize: "2.25rem", textTransform: "uppercase", letterSpacing: "-0.02em", textAlign: "center" }}>Activá tu cuenta</h1>
      {recovery || !session ? (
        <p role="alert" style={{ margin: "0.6rem 0 0", color: "#ffb3c7", fontSize: 13, lineHeight: 1.4, textAlign: "center" }}>No se pudo continuar con la activación.</p>
      ) : (
        <ActivationForm />
      )}
    </AuthCard>
  );
}
