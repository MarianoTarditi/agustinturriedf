import styles from "@/components/private-placeholder-page.module.css";
import { PrivateTopbar } from "@/components/private-topbar";

type PrivatePlaceholderPageProps = {
  title: string;
  description: string;
  cta: string;
};

export function PrivatePlaceholderPage({ title, description, cta }: PrivatePlaceholderPageProps) {
  return (
    <section className={styles.page}>
      <PrivateTopbar title={title} subtitle={description} />

      <div className={styles.wrapper}>
        <article className={styles.card}>
          <span className={styles.badge}>Próximamente</span>
          <p className={styles.copy}>Esta sección usa el mismo lenguaje visual Kinetic Noir y queda lista para conectar lógica real.</p>
          <button type="button" className={styles.button}>
            {cta}
          </button>
        </article>
      </div>
    </section>
  );
}
