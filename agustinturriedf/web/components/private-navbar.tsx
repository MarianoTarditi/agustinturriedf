"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialSymbol } from "@/components/material-symbol";
import styles from "@/components/private-navbar.module.css";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "dashboard",
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    icon: "group",
  },
  {
    href: "/pagos",
    label: "Pagos",
    icon: "payments",
  },
  {
    href: "/rutinas",
    label: "Rutinas",
    icon: "fitness_center",
  },
  {
    href: "/videoteca",
    label: "Videoteca",
    icon: "movie",
  },
];

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  return href !== "/dashboard" && pathname.startsWith(`${href}/`);
}

export function PrivateNavbar() {
  const pathname = usePathname();
  const profileActive = pathname === "/perfil" || pathname.startsWith("/perfil/");

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandArea}>
        <h1 className={styles.brand}>Agustin Turri</h1>
        <p className={styles.subtitle}>Entrenador de fuerza</p>
      </div>

      <nav className={styles.nav} aria-label="Navegación privada">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link key={item.href} href={item.href} className={`${styles.link} ${active ? styles.linkActive : ""}`}>
              <span className={styles.icon}>
                <MaterialSymbol
                  name={item.icon}
                  className={styles.navIcon}
                  weight={active ? 500 : 420}
                  opticalSize={20}
                  fill={active ? 1 : 0}
                />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.bottomArea}>
        <Link href="/perfil" className={`${styles.profileArea} ${styles.profileLink} ${profileActive ? styles.profileActive : ""}`}>
          <div className={styles.avatar}>
            <MaterialSymbol
              name={profileActive ? "account_circle" : "person"}
              className={styles.avatarIcon}
              fill={profileActive ? 1 : 0}
              weight={profileActive ? 500 : 450}
              opticalSize={20}
            />
          </div>
          <div>
            <p className={styles.profileName}>Agustín Turri</p>
            <p className={styles.profileRole}>Entrenador</p>
          </div>
        </Link>

        <Link href="/login" className={styles.logoutButton}>
          <MaterialSymbol name="logout" className={styles.logoutIcon} opticalSize={20} />
          <span>Cerrar sesión</span>
        </Link>
      </div>
    </aside>
  );
}
