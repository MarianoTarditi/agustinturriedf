import styles from "@/app/(private)/perfil/perfil.module.css";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";

const profileData = {
  name: "Agustín Turri",
  email: "trainer@gmail.com",
  phone: "+54 2474 403379",
  role: "trainer",
  birthday: "07/05/2004",
  gender: "male",
  height: "182 cm",
  weight: "92 kg",
  createdAt: "12/02/2026",
  experience: "8+ Años",
  athletes: "120+",
  status: "Activo",
  photo:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBqgtqgjlAxP52Jn22d-ZH2B0dwpo6xRvYMvUlmlWtCIVAtpKErLGmQvI-mtWq9X8a6APByhlYYL69d8IOeN9aCyRGzF9uUf5c6wsLsLhVaHry1kabbScxvTYI3doNaa1IAjh-SE1bYzR680OgxECA_P08LFxJ_mio3HtKeBJLFm9hds2xCqG-EtTYedYWB4yOYcI5bXjtkwX0CCHzjFWm_1mgYq8XgizqToQASCWWD0qffFjxZQuPGfoKt34vVlbyiy4QChgUIuURu",
};

const technicalInfo = [
  { label: "Email", value: profileData.email },
  { label: "Teléfono", value: profileData.phone },
  { label: "Roles", value: profileData.role },
  { label: "Nacimiento", value: profileData.birthday },
  { label: "Género", value: profileData.gender },
  { label: "Altura", value: profileData.height },
  { label: "Peso", value: profileData.weight },
  { label: "Creación", value: profileData.createdAt },
];

export default function PerfilPage() {
  return (
    <section className={styles.page}>
      <PrivateBreadcrumb current="Perfil" />
      <PrivateTopbar
        title="Perfil Profesional"
        subtitle="Gestiona tu identidad, datos de salud y disponibilidad para mantener una presencia premium y consistente en toda la plataforma."
      />

      <div className={styles.content}>
        <section className={styles.heroGrid}>
          <article className={styles.heroCard}>
            <div className={styles.avatarShell}>
              <img src={profileData.photo} alt={profileData.name} className={styles.heroPhoto} />
              <div className={styles.statusChip}>
                <span className={styles.statusDot} aria-hidden="true" />
                <span>{profileData.status}</span>
              </div>
            </div>

            <div className={styles.identity}>
              <header className={styles.identityHeader}>
                <h2>{profileData.name}</h2>
                <p>{profileData.email}</p>
              </header>

              <div className={styles.stats}>
                <article className={styles.statCard}>
                  <p>Experiencia</p>
                  <strong>{profileData.experience}</strong>
                </article>
                <article className={styles.statCard}>
                  <p>Atletas</p>
                  <strong>{profileData.athletes}</strong>
                </article>
              </div>
            </div>
          </article>

          <article className={styles.presenceCard}>
            <span className={styles.presenceIconWrap}>
              <MaterialSymbol name="verified" className={styles.presenceIcon} fill={1} weight={450} opticalSize={24} />
            </span>
            <h3>Presencia Premium</h3>
            <p>Tu perfil está optimizado para la red de entrenamiento NOIR.</p>

            <button type="button" className={styles.secondaryButton}>
              Ver vista pública
            </button>
          </article>
        </section>

        <section className={styles.infoSection}>
          <header className={styles.infoHeader}>
            <h3>Especificaciones Técnicas</h3>
          </header>

          <div className={styles.infoGrid}>
            {technicalInfo.map((item) => (
              <article key={item.label} className={styles.infoItem}>
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </section>

        <footer className={styles.footerActions}>
          <button type="button" className={styles.primaryButton}>
            <MaterialSymbol name="edit" className={styles.buttonIcon} fill={1} weight={500} opticalSize={20} />
            Editar perfil
          </button>
        </footer>
      </div>
    </section>
  );
}
