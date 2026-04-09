import Image from "next/image";

const whatsappNumber = "5491178296710";
const whatsappMessage = "Hola Agustin! Quiero solicitar información sobre los planes de entrenamiento.";
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

const socialLinks = [
  {
    href: whatsappUrl,
    label: "WhatsApp",
    icon: "/icons/whatsapp.svg",
    width: 24,
    height: 24,
  },
  {
    href: "https://www.instagram.com/agustinturri.edf/",
    label: "Instagram",
    icon: "/icons/instagram.svg",
    width: 24,
    height: 24,
  },
  {
    href: "mailto:agustinturri1@gmail.com",
    label: "Email",
    icon: "/icons/gmailBlanco.svg",
    width: 24,
    height: 24,
  },
];

export function PublicFooter() {
  return (
    <footer style={{ background: "#000000", width: "100%", padding: "3.5rem 2rem 1.75rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "2rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          <a href="#" className="footer-logo-link" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
            <Image
              alt="AgustinTurriEDF Logo"
              src="/Logo.png"
              width={112}
              height={56}
              className="footer-logo"
              style={{
                height: "3.5rem",
                width: "auto",
                objectFit: "contain",
              }}
            />
          </a>

          <div style={{ display: "flex", gap: "1rem" }}>
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                aria-label={link.label}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                className="footer-social-link"
                style={{
                  color: "#6b7280",
                  opacity: 0.8,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Image src={link.icon} width={link.width} height={link.height} alt={link.label} />
              </a>
            ))}
          </div>
        </div>

        <div style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#9ca3af", opacity: 0.6 }}>
          © 2026 AgustinTurriEDF. Todos los derechos reservados.
        </div>
      </div>

    </footer>
  );
}
