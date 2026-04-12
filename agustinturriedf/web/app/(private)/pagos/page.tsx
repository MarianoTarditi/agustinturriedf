import styles from "@/app/(private)/pagos/pagos.module.css";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";

type PaymentMetric = {
  icon: string;
  label: string;
  value: string;
  detail: string;
  tone: "primary" | "warning" | "error" | "monitor";
};

type PaymentRow = {
  initials: string;
  name: string;
  email: string;
  phone: string;
  amount: string;
  dueDate: string;
  daysToExpire: string;
  status: "Activo";
};

const metrics: PaymentMetric[] = [
  {
    icon: "payments",
    label: "Pagos Cobrados",
    value: "0",
    detail: "$ 0,00",
    tone: "primary",
  },
  {
    icon: "warning",
    label: "Vence Pronto",
    value: "0",
    detail: "Próximos 3 días",
    tone: "warning",
  },
  {
    icon: "error",
    label: "Vencidos",
    value: "0",
    detail: "Pendiente: $ 0,00",
    tone: "error",
  },
  {
    icon: "monitoring",
    label: "Total Estimado",
    value: "$ 0,00",
    detail: "Alumnos: 1",
    tone: "monitor",
  },
];

const payments: PaymentRow[] = [
  {
    initials: "MT",
    name: "Mariano Tarditi",
    email: "student@gmail.com",
    phone: "+54 9 11 1234 5678",
    amount: "$ 45.000",
    dueDate: "15/10/2023",
    daysToExpire: "3 días",
    status: "Activo",
  },
];

export default function PagosPage() {
  return (
    <section className={styles.page}>
      <PrivateBreadcrumb current="Pagos" />
      <PrivateTopbar
        title="Gestión de Pagos"
        subtitle="Visualiza estado financiero, vencimientos y recordatorios en una vista operativa para sostener ingresos y adherencia."
      />

      <div className={styles.content}>
        <section className={styles.metrics}>
          {metrics.map((metric) => (
            <article key={metric.label} className={styles.metricCard}>
              <div className={styles.metricGlow} aria-hidden="true" />
              <div className={styles.metricTop}>
                <span className={`${styles.metricIcon} ${styles[`metricIcon_${metric.tone}`]}`}>
                  <MaterialSymbol name={metric.icon} className={styles.metricSymbol} weight={500} opticalSize={20} />
                </span>
              </div>

              <h3 className={styles.metricLabel}>{metric.label}</h3>
              <p className={styles.metricValue}>
                {metric.value} <span className={styles[`metricDetail_${metric.tone}`]}>{metric.detail}</span>
              </p>
            </article>
          ))}
        </section>

        <section className={styles.tableSection}>
          <div className={styles.tableToolbar}>
            <label className={styles.searchWrap}>
              <MaterialSymbol name="search" className={styles.searchIcon} weight={420} opticalSize={18} />
              <input type="search" placeholder="Filtrar por nombre, email o teléfono..." />
            </label>

            <div className={styles.tableActions}>
              <button type="button" className={styles.sortButton}>
                <MaterialSymbol name="sort" className={styles.actionIcon} weight={450} opticalSize={20} />
                Ordenar vista
              </button>
              <button type="button" className={styles.createButton}>
                <MaterialSymbol name="add_card" className={styles.actionIcon} weight={500} opticalSize={20} />
                Registrar Pago
              </button>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <div className={styles.tableScroll}>
              <table>
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Monto</th>
                    <th>Próximo Venc.</th>
                    <th>Días a vencer</th>
                    <th>Estado</th>
                    <th className={styles.alignRight}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.email}>
                      <td>
                        <div className={styles.studentWrap}>
                          <span className={styles.initials}>{payment.initials}</span>
                          <span className={styles.studentName}>{payment.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.subtleText}>{payment.email}</span>
                      </td>
                      <td>
                        <span className={styles.subtleText}>{payment.phone}</span>
                      </td>
                      <td>
                        <span className={styles.amount}>{payment.amount}</span>
                      </td>
                      <td>
                        <span className={styles.subtleText}>{payment.dueDate}</span>
                      </td>
                      <td>
                        <span className={styles.subtleText}>{payment.daysToExpire}</span>
                      </td>
                      <td>
                        <span className={styles.statusWrap}>
                          <span className={styles.statusDot} aria-hidden="true" />
                          <span className={styles.statusText}>{payment.status}</span>
                        </span>
                      </td>
                      <td className={styles.alignRight}>
                        <div className={styles.rowActions}>
                          <button type="button" className={styles.rowButton} aria-label={`Editar ${payment.name}`}>
                            <MaterialSymbol name="edit" className={styles.rowActionIcon} weight={500} opticalSize={20} />
                          </button>
                          <button type="button" className={styles.rowButton} aria-label={`Más acciones para ${payment.name}`}>
                            <MaterialSymbol name="more_vert" className={styles.rowActionIcon} weight={500} opticalSize={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className={styles.pagination}>
              <p>Página 1 de 1</p>

              <div className={styles.paginationControls}>
                <div className={styles.rowsControl}>
                  <p>Filas:</p>
                  <select defaultValue="10" aria-label="Filas por página">
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </div>

                <div className={styles.paginationButtons}>
                  <button type="button" disabled aria-label="Página anterior">
                    <MaterialSymbol name="chevron_left" className={styles.paginationIcon} weight={500} opticalSize={20} />
                  </button>
                  <button type="button" aria-label="Página siguiente">
                    <MaterialSymbol name="chevron_right" className={styles.paginationIcon} weight={500} opticalSize={20} />
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </section>
      </div>
    </section>
  );
}
