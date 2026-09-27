import { cookies } from "next/headers";
import React from "react";

import { AuthCard } from "../_components/auth-card";

import { ActivationForm } from "@/app/(auth)/activation/_components/activation-form";

export default async function ActivationPage({ searchParams }: { searchParams: Promise<{ recovery?: string }> }) {
  const session = (await cookies()).get("activation_session")?.value;
  const recovery = (await searchParams).recovery === "1";

  return (
    <AuthCard>
      <h1>Activá tu cuenta</h1>
      {recovery || !session ? (
        <p role="alert">No se pudo continuar con la activación.</p>
      ) : (
        <ActivationForm />
      )}
    </AuthCard>
  );
}
