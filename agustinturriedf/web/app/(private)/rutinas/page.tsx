import styles from "@/app/(private)/rutinas/rutinas.module.css";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";

type RoutineFormat = "excel" | "pdf" | "generic";

type RoutineTemplate = {
  name: string;
  date: string;
  size: string;
  format: RoutineFormat;
};

const templates: RoutineTemplate[] = [
  {
    name: "Plan de Volumen Avanzado v2",
    date: "31/3/2026",
    size: "67 KB",
    format: "excel",
  },
  {
    name: "Guía Nutricional Suplementos",
    date: "15/3/2026",
    size: "2.4 MB",
    format: "pdf",
  },
  {
    name: "Rutina Full Body Inicial",
    date: "10/2/2026",
    size: "142 KB",
    format: "generic",
  },
];

const templateVisualMap: Record<RoutineFormat, { icon: string; borderClass: string; iconClass: string; chip: string }> = {
  excel: {
    icon: "description",
    borderClass: styles.template_excel,
    iconClass: styles.fileIcon_excel,
    chip: "Excel",
  },
  pdf: {
    icon: "picture_as_pdf",
    borderClass: styles.template_pdf,
    iconClass: styles.fileIcon_pdf,
    chip: "PDF",
  },
  generic: {
    icon: "insert_drive_file",
    borderClass: styles.template_generic,
    iconClass: styles.fileIcon_generic,
    chip: "Archivo",
  },
};

export default function RutinasPage() {
  return (
    <section className={styles.page}>
      <PrivateBreadcrumb current="Rutinas" />
      <PrivateTopbar
        title="Gestión de Rutinas"
        subtitle="Organizá plantillas en PDF y Excel desde una vista operativa para mantener planes actualizados y acceso ordenado para el equipo."
      />

      <div className={styles.content}>
        <div className={styles.layoutGrid}>
          <section className={styles.uploadColumn}>
            <article className={styles.uploadCard}>
              <h2>Subir nueva plantilla</h2>

              <div className={styles.fieldGroup}>
                <label htmlFor="template-title">Título de la plantilla (opcional)</label>
                <input id="template-title" type="text" placeholder="Ej: Definición 12 Semanas" />
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="template-file">Seleccionar archivo</label>

                <div className={styles.dropzone}>
                  <MaterialSymbol name="cloud_upload" className={styles.dropzoneIcon} weight={420} opticalSize={32} />
                  <p>Arrastrá tu archivo o hacé clic aquí</p>
                  <span>Formatos permitidos: .pdf, .xls, .xlsx</span>
                </div>

                <input id="template-file" type="file" accept=".pdf,.xls,.xlsx" className={styles.hiddenInput} />
              </div>

              <button type="button" className={styles.uploadButton}>
                <MaterialSymbol name="upload_file" className={styles.uploadIcon} weight={500} opticalSize={20} />
                Subir plantilla
              </button>
            </article>

            <article className={styles.tipCard}>
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBv4Kl-kaz_1Sy87HMm7ooFqQV2ULiloSRfqIHGRcdtw8XQXXwHWOKSTcjHWqTVxgLv3X3v-yJzwMWzOZKur6r1BBwpOo0iNgl1NdaZmyJB93OY8y3NmWkRcvaFkne5HzrvFPZ-ZAO7bSiu-wwsFyfuonreKrRJKptS3IF1rTnw5ChA2Ed_Nh9FqT2q_fg_E0SX_vudRP2atJqQvjOr2AtVzA0AgFb3YlVSrw7GEd3ouul4BilgjLezH36I-BEyuwGgrGu5bonICCxy"
                alt="Ambiente de entrenamiento"
              />

              <div className={styles.tipOverlay} aria-hidden="true" />

              <div className={styles.tipContent}>
                <p className={styles.tipEyebrow}>Tip de experto</p>
                <p className={styles.tipText}>Mantené tus archivos organizados por nombre y fecha para un acceso rápido.</p>
              </div>
            </article>
          </section>

          <section className={styles.libraryColumn}>
            <header className={styles.libraryHeader}>
              <h2>Plantillas cargadas</h2>

              <div className={styles.filterTabs} role="tablist" aria-label="Filtrar plantillas">
                <button type="button" role="tab" aria-selected="true" className={`${styles.filterTab} ${styles.filterTabActive}`}>
                  Todo
                </button>
                <button type="button" role="tab" aria-selected="false" className={styles.filterTab}>
                  PDF
                </button>
                <button type="button" role="tab" aria-selected="false" className={styles.filterTab}>
                  Excel
                </button>
              </div>
            </header>

            <div className={styles.fileList}>
              {templates.map((template) => {
                const visual = templateVisualMap[template.format];

                return (
                  <article key={template.name} className={`${styles.templateItem} ${visual.borderClass}`}>
                    <div className={`${styles.fileIconWrap} ${visual.iconClass}`}>
                      <MaterialSymbol name={visual.icon} className={styles.fileIcon} weight={420} opticalSize={28} />
                    </div>

                    <div className={styles.templateMeta}>
                      <h3>{template.name}</h3>

                      <div className={styles.templateDetails}>
                        <span className={styles.chip}>{visual.chip}</span>

                        <span className={styles.metaItem}>
                          <MaterialSymbol name="calendar_today" className={styles.metaIcon} weight={420} opticalSize={16} />
                          {template.date}
                        </span>

                        <span className={styles.metaItem}>
                          <MaterialSymbol name="database" className={styles.metaIcon} weight={420} opticalSize={16} />
                          {template.size}
                        </span>
                      </div>
                    </div>

                    <div className={styles.rowActions}>
                      <button type="button" className={styles.openButton}>
                        Abrir
                      </button>

                      <button type="button" className={styles.iconAction} aria-label={`Editar ${template.name}`}>
                        <MaterialSymbol name="edit" className={styles.rowActionIcon} weight={500} opticalSize={20} />
                      </button>

                      <button
                        type="button"
                        className={`${styles.iconAction} ${styles.deleteAction}`}
                        aria-label={`Eliminar ${template.name}`}
                      >
                        <MaterialSymbol name="delete" className={styles.rowActionIcon} weight={500} opticalSize={20} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <footer className={styles.libraryFooter}>
              <p>Mostrando 3 plantillas</p>

              <div>
                <button type="button">Anterior</button>
                <button type="button">Siguiente</button>
              </div>
            </footer>
          </section>
        </div>
      </div>

      <div className={styles.localGlowPrimary} aria-hidden="true" />
      <div className={styles.localGlowSecondary} aria-hidden="true" />
    </section>
  );
}
