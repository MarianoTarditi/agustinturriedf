import Link from "next/link";

import { MaterialSymbol } from "@/components/material-symbol";
import styles from "@/components/private-breadcrumb.module.css";

type BreadcrumbLink = {
  id: string;
  name: string;
  href?: string;
};

type PrivateBreadcrumbProps = {
  current: string;
  root?: string | { label: string; href?: string };
  ancestors?: BreadcrumbLink[];
};

export function PrivateBreadcrumb({ current, root, ancestors = [] }: PrivateBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
      {typeof root === "string" ? (
        <span className={styles.item}>{root}</span>
      ) : root ? (
        root.href ? (
          <Link href={root.href} className={styles.item}>
            {root.label}
          </Link>
        ) : (
          <span className={styles.item}>{root.label}</span>
        )
      ) : null}

      {ancestors.map((ancestor) => (
        <span key={ancestor.id}>
          <MaterialSymbol name="chevron_right" className={styles.separator} weight={500} opticalSize={16} />
          {ancestor.href ? (
            <Link href={ancestor.href} className={styles.item}>
              {ancestor.name}
            </Link>
          ) : (
            <span className={styles.item}>{ancestor.name}</span>
          )}
        </span>
      ))}

      <MaterialSymbol name="chevron_right" className={styles.separator} weight={500} opticalSize={16} />
      <span className={`${styles.item} ${styles.current}`} aria-current="page">
        {current}
      </span>
    </nav>
  );
}
