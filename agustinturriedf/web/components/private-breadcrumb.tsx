import { MaterialSymbol } from "@/components/material-symbol";
import styles from "@/components/private-breadcrumb.module.css";

type PrivateBreadcrumbProps = {
  current: string;
  root?: string;
};

export function PrivateBreadcrumb({ current, root = "Área privada" }: PrivateBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
      <span className={styles.item}>{root}</span>
      <MaterialSymbol name="chevron_right" className={styles.separator} weight={500} opticalSize={16} />
      <span className={`${styles.item} ${styles.current}`} aria-current="page">
        {current}
      </span>
    </nav>
  );
}
