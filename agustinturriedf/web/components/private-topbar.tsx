import styles from "@/components/private-topbar.module.css";
import { MaterialSymbol } from "@/components/material-symbol";

type PrivateTopbarProps = {
  title?: string;
  subtitle?: string;
  context?: string;
};

export function PrivateTopbar({ title, subtitle, context = "AgustinTurriEDF · Área privada" }: PrivateTopbarProps) {
  const hasHeroCopy = Boolean(title || subtitle);

  return (
    <header className={styles.topbar}>
      <div className={styles.leading}>
        {title ? <h1 className={styles.title}>{title}</h1> : null}
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}

        {!hasHeroCopy ? <p className={styles.context}>{context}</p> : null}
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.iconButton} aria-label="Notificaciones">
          <MaterialSymbol name="notifications" className={styles.topbarIcon} weight={420} opticalSize={20} />
        </button>
        <button type="button" className={styles.iconButton} aria-label="Ayuda">
          <MaterialSymbol name="help" className={styles.topbarIcon} weight={420} opticalSize={20} />
        </button>
      </div>
    </header>
  );
}
