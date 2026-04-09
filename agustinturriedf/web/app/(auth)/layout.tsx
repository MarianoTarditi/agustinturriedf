import Link from "next/link";
import Image from "next/image";
import { PublicFooter } from "@/components/public-footer";

const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL ?? "http://localhost:3009";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "radial-gradient(circle at 50% 45%, rgba(123,44,191,0.12) 0%, rgba(0,0,0,0) 55%), #000",
      }}
    >
      <header
        className="login-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          width: "100%",
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(40px)",
          boxShadow: "0px 20px 40px rgba(123,44,191,0.08)",
        }}
      >
        <div
          style={{
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1.5rem 2rem",
          }}
        >
          <Link
            href={landingUrl}
            className="login-brand"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              textDecoration: "none",
            }}
          >
            <Image
              alt="AgustinTurriEDF Logo"
              src="/Logo.png"
              width={112}
              height={56}
              style={{
                height: "3.5rem",
                width: "auto",
                objectFit: "contain",
              }}
            />
          </Link>

          <Link
            href={landingUrl}
            className="header-cta"
            style={{
              display: "inline-block",
              padding: "0.5rem 1.5rem",
              borderRadius: 8,
              fontFamily: "var(--font-space-grotesk)",
              fontSize: 14,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "#e4c2ff",
              letterSpacing: "0.08em",
              background: "linear-gradient(90deg, #7b2cbf 0%, #680eac 100%)",
              textDecoration: "none",
            }}
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      <section style={{ flex: 1, display: "grid", placeItems: "center", padding: "2rem 1rem" }}>{children}</section>

      <PublicFooter />
    </main>
  );
}
