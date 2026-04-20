import { auth } from "@/auth";
import { PrivateNavbar } from "@/components/private-navbar";
import styles from "@/components/private-shell.module.css";

type PrivateShellProps = {
  children: React.ReactNode;
};

export async function PrivateShell({ children }: PrivateShellProps) {
  const session = await auth();

  return (
    <div className={styles.shell}>
      <PrivateNavbar currentUser={session?.user ?? null} />

      <main className={styles.canvas}>
        <div className={styles.content}>{children}</div>
      </main>

      <div className={styles.glowPrimary} aria-hidden="true" />
      <div className={styles.glowSecondary} aria-hidden="true" />
    </div>
  );
}
