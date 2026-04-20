"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { MaterialSymbol } from "@/components/material-symbol";
import styles from "@/components/private-navbar.module.css";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles?: Role[];
};

type Role = "ADMIN" | "TRAINER" | "STUDENT";

type CurrentUser = Session["user"] | null;

type PrivateNavbarProps = {
  currentUser: CurrentUser;
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
    roles: ["ADMIN", "TRAINER"],
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

const roleLabel: Record<Role, string> = {
  ADMIN: "Administrador",
  TRAINER: "Entrenador",
  STUDENT: "Alumno",
};

const isRole = (value: unknown): value is Role =>
  value === "ADMIN" || value === "TRAINER" || value === "STUDENT";

export function PrivateNavbar({ currentUser }: PrivateNavbarProps) {
  const pathname = usePathname();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const currentRole = currentUser?.role;

  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles?.length || !isRole(currentRole)) return true;
    return item.roles.includes(currentRole);
  });

  const displayName = currentUser?.name?.trim() || "Usuario";
  const displayRole = isRole(currentRole) ? roleLabel[currentRole] : "Sin rol";

  const profileActive = pathname === "/perfil" || pathname.startsWith("/perfil/");
  const profileTriggerActive = profileActive || profileMenuOpen;

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!profileMenuRef.current) return;

      const target = event.target;
      if (target instanceof Node && !profileMenuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandArea}>
        <h1 className={styles.brand}>Agustin Turri</h1>
        <p className={styles.subtitle}>Entrenador de fuerza</p>
      </div>

      <div className={styles.sidebarBody}>
        <nav className={styles.nav} aria-label="Navegación privada">
          {visibleNavItems.map((item) => {
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
          <div className={styles.profileMenu} ref={profileMenuRef}>
            <button
              type="button"
              className={`${styles.profileArea} ${styles.profileTrigger} ${profileTriggerActive ? styles.profileActive : ""}`}
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              aria-controls="private-navbar-profile-menu"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
            >
              <div className={styles.avatar}>
                <MaterialSymbol
                  name={profileTriggerActive ? "account_circle" : "person"}
                  className={styles.avatarIcon}
                  fill={profileTriggerActive ? 1 : 0}
                  weight={profileTriggerActive ? 500 : 450}
                  opticalSize={20}
                />
              </div>
              <div>
                <p className={styles.profileName}>{displayName}</p>
                <p className={styles.profileRole}>{displayRole}</p>
              </div>
              <MaterialSymbol
                name={profileMenuOpen ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                className={styles.profileChevron}
                opticalSize={20}
              />
            </button>

            <div
              id="private-navbar-profile-menu"
              className={`${styles.dropdownMenu} ${profileMenuOpen ? styles.dropdownMenuOpen : ""}`}
              role="menu"
              aria-label="Opciones de perfil"
              aria-hidden={!profileMenuOpen}
            >
              <Link
                href="/perfil"
                className={`${styles.dropdownItem} ${styles.dropdownItemProfile}`}
                role="menuitem"
                tabIndex={profileMenuOpen ? 0 : -1}
              >
                <MaterialSymbol name="account_circle" className={styles.dropdownIcon} opticalSize={20} />
                <span>Perfil</span>
              </Link>
              <button
                type="button"
                className={`${styles.dropdownItem} ${styles.dropdownItemLogout}`}
                role="menuitem"
                tabIndex={profileMenuOpen ? 0 : -1}
                disabled={loggingOut}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
                onClick={async () => {
                  if (loggingOut) return;
                  setLoggingOut(true);
                  await signOut({ callbackUrl: "/login" });
                }}
              >
                <MaterialSymbol name="logout" className={styles.dropdownIcon} opticalSize={20} />
                <span>{loggingOut ? "Cerrando..." : "Cerrar sesión"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
