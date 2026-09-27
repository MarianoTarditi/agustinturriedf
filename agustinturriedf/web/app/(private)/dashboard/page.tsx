import styles from "@/app/(private)/dashboard/dashboard.module.css";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";

type MetricCard = {
  icon: string;
  value: string;
  label: string;
  detail: string;
  tone: "secondary" | "primary" | "tertiary" | "neutral";
  badge?: string;
  pulse?: boolean;
};

type LogItem = {
  text: string;
  highlight?: string;
  time: string;
  tone: "primary" | "error";
};

const metrics: MetricCard[] = [
  {
    icon: "group",
    value: "1",
    label: "Estudiantes activos",
    detail: "Total registrado: 1",
    tone: "secondary",
    badge: "Estatus: Activo",
  },
  {
    icon: "payments",
    value: "1",
    label: "Pagos pendientes",
    detail: "Seguimiento financiero",
    tone: "primary",
    pulse: true,
  },
  {
    icon: "fitness_center",
    value: "20",
    label: "Rutinas + Ejercicios",
    detail: "8 rutinas · 12 ejercicios",
    tone: "tertiary",
  },
  {
    icon: "monitoring",
    value: "0",
    label: "Progreso del mes",
    detail: "Entrenamientos registrados",
    tone: "neutral",
  },
];

const logs: LogItem[] = [
  {
    text: "Nueva rutina asignada:",
    highlight: "Power-Lift X",
    time: "Hoy, 09:12 AM",
    tone: "primary",
  },
  {
    text: "Pago pendiente detectado para Lucas Silva",
    time: "Ayer, 06:45 PM",
    tone: "error",
  },
];

const chartBars = [24, 48, 74, 20, 32, 50, 92];

export default function DashboardPage() {
  return (
    <section className={styles.page}>
      <PrivateBreadcrumb current="Dashboard" />

      <div className={styles.content}>
        <header className={styles.hero}>
          <h1>
            Performance <span>Command Center</span>
          </h1>
          <p>
            Monitorea alumnos, pagos, rutinas y progreso en un tablero con foco total en consistencia, disciplina y
            resultados medibles.
          </p>
        </header>

        <section className={styles.metrics} aria-label="Resumen operativo">
          {metrics.map((metric) => (
            <article key={metric.label} className={styles.metricCard}>
              <div className={styles.metricGlow} aria-hidden="true" />
              <div className={styles.metricTop}>
                <span className={`${styles.metricIcon} ${styles[`metricIcon_${metric.tone}`]}`}>
                  <MaterialSymbol name={metric.icon} className={styles.metricSymbol} weight={500} opticalSize={22} />
                </span>
                {metric.badge ? <span className={styles.metricBadge}>{metric.badge}</span> : null}
                {metric.pulse ? <span className={styles.pulseDot} aria-hidden="true" /> : null}
              </div>

              <p className={styles.metricValue}>{metric.value}</p>
              <h2 className={styles.metricLabel}>{metric.label}</h2>

              <footer className={styles.metricFooter}>
                <span>{metric.detail}</span>
                <MaterialSymbol name="arrow_forward" className={styles.metricArrow} weight={500} opticalSize={18} />
              </footer>
            </article>
          ))}
        </section>

        <section className={styles.lowerGrid}>
          <article className={styles.activityCard}>
            <header className={styles.activityHeader}>
              <div>
                <h3>Actividad de Alumnos</h3>
                <p>Análisis de consistencia semanal</p>
              </div>

              <div className={styles.activityControls}>
                <label className={styles.selectWrap}>
                  <select defaultValue="">
                    <option value="">Seleccionar alumno...</option>
                    <option value="lucas">Lucas Silva</option>
                    <option value="ana">Ana Garcia</option>
                    <option value="mateo">Mateo Rodriguez</option>
                  </select>
                  <MaterialSymbol name="expand_more" className={styles.selectIcon} weight={500} opticalSize={16} />
                </label>

                <button type="button" className={styles.rangeActive}>
                  7D
                </button>
                <button type="button" className={styles.rangeMuted}>
                  30D
                </button>
              </div>
            </header>

            <div className={styles.chartArea}>
              <div className={styles.chartPlot}>
                {chartBars.map((height, index) => (
                  <span
                    key={`${height}-${index}`}
                    className={`${styles.chartBar} ${index === chartBars.length - 1 ? styles.chartBarAccent : ""}`}
                    style={{ height: `${height}%` }}
                  />
                ))}

                <p className={styles.chartBadge}>Esperando datos de sesión</p>
              </div>
            </div>

            <div className={styles.activityTail} aria-hidden="true" />
          </article>

          <aside className={styles.sideColumn}>
            <article className={styles.profileCard}>
              <div className={styles.profileGlow} aria-hidden="true" />

              <div className={styles.profileTop}>
                <div className={styles.avatarWrap}>
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYdgZZiIGjY1M50xZfuVWoMXH9MLRSFpOBDdtNn2MQOFsEHlQ6fdDSNaD3YAlscipjigeL1Mx-XZS-wp7wc3i7qpnfSb8os44heYBtcoQwDJB_YD1kKD-IiljV1M8LY7BlN9Xbbb3XfYjl6q_XRhhhDWiryvzs9rvgysDVcCXNg7cDsGOyMacd-MjUv-Aw7eLfVjNEPUeUxOEHL1JLMjCypzewVazCnyWiWobs810wusmglP50CyOtmCHjssBNBaSLp_93Uis3ow1b"
                    alt="Lucas Silva"
                    className={styles.avatarImage}
                  />
                  <span className={styles.avatarBadge}>
                    <MaterialSymbol name="star" className={styles.avatarBadgeIcon} fill={1} weight={500} opticalSize={14} />
                  </span>
                </div>

                <div>
                  <h3 className={styles.profileName}>Lucas Silva</h3>
                  <p className={styles.profileLabel}>Alumno desde hace 3 meses</p>
                </div>
              </div>

              <dl className={styles.profileMeta}>
                <div>
                  <dt>Última sesión</dt>
                  <dd>Hace 2 horas</dd>
                </div>
                <div>
                  <dt>Inicio</dt>
                  <dd className={styles.metaAccent}>02/02/2026</dd>
                </div>
                <div>
                  <dt>Próximo pago</dt>
                  <dd className={styles.metaError}>Vencido</dd>
                </div>
              </dl>

              <button type="button" className={styles.profileButton}>
                Ver detalles
              </button>
            </article>

            <article className={styles.logCard}>
              <header className={styles.logHeader}>
                <MaterialSymbol name="history" className={styles.logIcon} weight={500} opticalSize={16} />
                <h3>Bitácora reciente</h3>
              </header>

              <div className={styles.logItems}>
                {logs.map((item) => (
                  <div key={item.text} className={styles.logItem}>
                    <span className={`${styles.logStripe} ${item.tone === "error" ? styles.logStripeError : ""}`} aria-hidden="true" />
                    <div>
                      <p>
                        {item.text} {item.highlight ? <span>{item.highlight}</span> : null}
                      </p>
                      <time>{item.time}</time>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        </section>
      </div>

      <button type="button" className={styles.fab} aria-label="Agregar elemento">
        <MaterialSymbol name="add" className={styles.fabIcon} weight={500} opticalSize={32} />
      </button>
    </section>
  );
}
