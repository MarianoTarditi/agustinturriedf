import Link from "next/link";

import { AuthCard } from "@/app/(auth)/_components/auth-card";

export default function ActivationConfirmPage() {
  return (
    <AuthCard>
      <h1>Cuenta activada</h1>
      <p>Ya podés iniciar sesión con tu email y tu nueva contraseña.</p>
      <Link href="/login">Ir al login</Link>
    </AuthCard>
  );
}
