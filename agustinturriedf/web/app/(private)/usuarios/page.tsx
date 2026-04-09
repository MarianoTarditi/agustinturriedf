import styles from "@/app/(private)/usuarios/usuarios.module.css";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateTopbar } from "@/components/private-topbar";

type UserRow = {
  photo: string;
  name: string;
  email: string;
  role: "student" | "trainer" | "admin";
  status: "Activo" | "Inactivo";
};

const users: UserRow[] = [
  {
    photo:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCEOBSa1LORDZ37Pka37xQRV98m3zH_58ZCj86h_-50SpNh20-bRjJlmQxZa618aX6DXGI76ZMHdcE4NlLDFI98GEzqyX2J4lQQEFyg5M-gda7VGr81bTMHokT4eogHANBonmFSkvx-JowKsXT3opftip_P614RGd5ofgks36iIM_xS7vchmCGiK_lHOuBx0FNyhU6RmdJny7nxSUuEB7_dmDZwMOvSkYcpXXUxRKu3Qbhe-d_KAN-kPF6HVAeeeJgkekfCVHI3PPEf",
    name: "Lucas Silva",
    email: "lucas@gmail.com",
    role: "student",
    status: "Activo",
  },
  {
    photo:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBupNdmlNon-SJmn7ZPAf7H4OKsBwMDsvh0pnMkOXXzrO3OFM8Cty7LZnqgRtPjMplYJpoaHP9svoLpAUDmDhM3ri6V8fAbLPle523QItKO-gHZHCwOZIMvXIVdc8Zqrk1mKmr2eKZKIiOv_b4_lON5G6Sbb3y8aTP4bEOQPUUvTnhBLGKmk6nkkHFSkQazH0h-fzI-H6TNZJCDMVikbrSQ7n5FfazlGPRJ_FsbFUc0E_CDxiztBnHCE6fzl9OAyzHpHMMTwtpoc_ix",
    name: "Elena Torres",
    email: "e.torres@kinetic.com",
    role: "trainer",
    status: "Inactivo",
  },
  {
    photo:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCBpMjVFR49-yZrezjdr3YlkrbSOOvZdpVPurxIkdm-_s4yuKV8hwi4RdTD4ew_wIVvfRTjsUjFP76-8fN2rfy4ez4dqs7FKkY_NtCfjZOgna5GrTq_gSsP54DmgF-ZRF31K2L8gR9wyVsn3g3j9uhAakSRNsVPebuuQIIO508ToVN7_K8jSfTO65Y6KpI5_bursV6i7djnDhGdxDwBtSem9Hhgk0GrgiCkh8rpKKEu_0Xir-6esgwt27y5GT5xsvzLveP7ltiUaz6X",
    name: "Marco Rossi",
    email: "mrossi@admin.com",
    role: "admin",
    status: "Activo",
  },
];

function DotIcon() {
  return <span className={styles.dot} aria-hidden="true" />;
}

export default function UsuariosPage() {
  return (
    <section className={styles.page}>
      <PrivateTopbar
        title="Gestión de Alumnos"
        subtitle="Controla perfiles, roles y estado operativo de la base para mantener seguimiento preciso y comunicación efectiva."
      />

      <div className={styles.content}>
        <section className={styles.metrics}>
          <article className={styles.metricCard}>
            <div className={styles.metricGlow} aria-hidden="true" />
            <div className={styles.metricTop}>
              <span className={styles.metricIcon}>
                <MaterialSymbol name="person_check" className={styles.metricSymbol} weight={500} opticalSize={20} />
              </span>
              <span className={styles.metricBadge}>Tiempo real</span>
            </div>
            <h3 className={styles.metricLabel}>Alumnos activos</h3>
            <p className={styles.metricValue}>
              4 <span>1 inactivo</span>
            </p>
          </article>

          <article className={styles.metricCard}>
            <div className={styles.metricTop}>
              <span className={styles.metricIconSecondary}>
                <MaterialSymbol name="admin_panel_settings" className={styles.metricSymbol} weight={500} opticalSize={20} />
              </span>
            </div>
            <h3 className={styles.metricLabel}>Equipo de gestión</h3>
            <p className={styles.metricValue}>
              2 <span>Admins y trainers</span>
            </p>
          </article>

          <article className={styles.metricCard}>
            <div className={styles.metricTop}>
              <span className={styles.metricIconTertiary}>
                <MaterialSymbol name="database" className={styles.metricSymbol} weight={500} opticalSize={20} />
              </span>
            </div>
            <h3 className={styles.metricLabel}>Base total</h3>
            <p className={styles.metricValue}>
              5 <span>Usuarios registrados</span>
            </p>
          </article>
        </section>

        <section className={styles.tableSection}>
          <div className={styles.tableToolbar}>
            <div className={styles.tableTitleRow}>
              <h3>5 usuarios totales</h3>
              <DotIcon />
              <span>Lista actualizada</span>
            </div>

            <div className={styles.tableActions}>
              <button type="button" className={styles.sortButton}>
                <MaterialSymbol name="sort" className={styles.actionIcon} weight={450} opticalSize={20} />
                Ordenar vista
              </button>
              <button type="button" className={styles.createButton}>
                <MaterialSymbol name="person_add" className={styles.actionIcon} fill={1} weight={500} opticalSize={20} />
                Crear alumno
              </button>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>Estado</th>
                  <th className={styles.alignRight}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.email}>
                    <td>
                      <div className={`${styles.avatarWrap} ${user.status === "Inactivo" ? styles.avatarInactive : ""}`}>
                        <img src={user.photo} alt={user.name} className={styles.userImage} />
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.userName} ${user.status === "Inactivo" ? styles.userNameInactive : ""}`}>{user.name}</span>
                    </td>
                    <td>
                      <span className={`${styles.userEmail} ${user.status === "Inactivo" ? styles.userEmailInactive : ""}`}>{user.email}</span>
                    </td>
                    <td>
                      <span className={`${styles.roleChip} ${styles[`role_${user.role}`]}`}>{user.role}</span>
                    </td>
                    <td>
                      <span className={styles.statusWrap}>
                        <span className={`${styles.statusDot} ${user.status === "Activo" ? styles.active : styles.inactive}`} />
                        <span className={user.status === "Activo" ? styles.statusActive : styles.statusInactive}>{user.status}</span>
                      </span>
                    </td>
                    <td className={styles.alignRight}>
                      <button className={styles.moreButton} type="button" aria-label={`Acciones para ${user.name}`}>
                        <MaterialSymbol name="more_vert" className={styles.rowActionIcon} weight={500} opticalSize={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <footer className={styles.pagination}>
              <p>Página 1 de 1</p>
              <div>
                <button type="button" disabled>
                  <MaterialSymbol name="chevron_left" className={styles.paginationIcon} weight={500} opticalSize={20} />
                </button>
                <button type="button">
                  <MaterialSymbol name="chevron_right" className={styles.paginationIcon} weight={500} opticalSize={20} />
                </button>
              </div>
            </footer>
          </div>
        </section>
      </div>
    </section>
  );
}
