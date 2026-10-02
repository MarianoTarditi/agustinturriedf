import Link from "next/link";
import React from "react";

import { AuthCard } from "@/app/(auth)/_components/auth-card";

export default function ActivationConfirmPage() {
  return (
    <AuthCard maxWidth={440}>
      <h1 className="auth-title" style={{ margin: 0, fontFamily: "var(--font-space-grotesk)", fontSize: "2.25rem", textTransform: "uppercase", letterSpacing: "-0.02em", textAlign: "center" }}>Cuenta activada</h1>
      <p style={{ margin: "0.6rem 0 2rem", color: "var(--on-surface-variant)", opacity: 0.85, textAlign: "center" }}>Ya podés iniciar sesión con tu email y tu nueva contraseña.</p>
      <Link href="/login" className="login-submit" style={{ width: "100%", marginTop: 10, display: "inline-flex", justifyContent: "center", alignItems: "center", borderRadius: 8, color: "#e4c2ff", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, fontFamily: "var(--font-space-grotesk)", fontSize: "13.3333px", padding: "0.95rem 1rem", background: "linear-gradient(90deg, #7b2cbf 0%, #680eac 100%)", border: "none", cursor: "pointer", outlineOffset: 3 }}>Ir al login</Link>
    </AuthCard>
  );
}
