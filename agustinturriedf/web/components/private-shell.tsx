import { PrivateNavbar } from "@/components/private-navbar";
import styles from "@/components/private-shell.module.css";

type PrivateShellProps = {
  children: React.ReactNode;
};

export function PrivateShell({ children }: PrivateShellProps) {
  return (
    <div className={styles.shell}>
      <PrivateNavbar />

      <main className={styles.canvas}>
        <div className={styles.content}>{children}</div>
      </main>

      <div className={styles.glowPrimary} aria-hidden="true" />
      <div className={styles.glowSecondary} aria-hidden="true" />
    </div>
  );
}
