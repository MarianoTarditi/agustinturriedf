"use client";

import { useState } from "react";
import styles from "@/app/(private)/rutinas/rutinas.module.css";
import { DestructiveConfirmationModal } from "@/components/destructive-confirmation-modal";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";

type RoutineFormat = "excel" | "pdf" | "generic";

type RoutineTemplate = {
  id: string;
  name: string;
  date: string;
  size: string;
  format: RoutineFormat;
};

const initialTemplates: RoutineTemplate[] = [
  {
    id: "template-1",
    name: "Plan de Volumen Avanzado v2",
    date: "31/3/2026",
    size: "67 KB",
    format: "excel",
  },
  {
    id: "template-2",
    name: "Guía Nutricional Suplementos",
    date: "15/3/2026",
    size: "2.4 MB",
    format: "pdf",
  },
  {
    id: "template-3",
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
  const [templates, setTemplates] = useState<RoutineTemplate[]>(initialTemplates);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [activeDeleteTemplate, setActiveDeleteTemplate] = useState<RoutineTemplate | null>(null);
  const [draftTemplateName, setDraftTemplateName] = useState("");

  const activeTemplate = activeTemplateId ? templates.find((template) => template.id === activeTemplateId) ?? null : null;

  const openEditModal = (template: RoutineTemplate) => {
    setActiveTemplateId(template.id);
    setDraftTemplateName(template.name);
  };

  const closeEditModal = () => {
    setActiveTemplateId(null);
    setDraftTemplateName("");
  };

  const handleConfirmEdit = () => {
    if (!activeTemplateId) return;

    const trimmedName = draftTemplateName.trim();
    if (!trimmedName) return;

    setTemplates((currentTemplates) =>
      currentTemplates.map((template) => (template.id === activeTemplateId ? { ...template, name: trimmedName } : template)),
    );

    closeEditModal();
  };

  const openDeleteModal = (template: RoutineTemplate) => {
    setActiveDeleteTemplate(template);
  };

  const closeDeleteModal = () => {
    setActiveDeleteTemplate(null);
  };

  const handleConfirmDelete = () => {
    if (!activeDeleteTemplate) return;

    setTemplates((currentTemplates) => currentTemplates.filter((template) => template.id !== activeDeleteTemplate.id));
    closeDeleteModal();
  };

  return (
    <section className={styles.page}>
      <PrivateBreadcrumb current="Rutinas" />
      <PrivateTopbar
        title="Gestión de Rutinas"
        subtitle="Organizá plantillas en PDF y Excel para mantener planes actualizados y acceso ordenado para el equipo."
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
                  <article key={template.id} className={`${styles.templateItem} ${visual.borderClass}`}>
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

                      <button
                        type="button"
                        className={styles.iconAction}
                        aria-label={`Editar ${template.name}`}
                        onClick={() => openEditModal(template)}
                      >
                        <MaterialSymbol name="edit" className={styles.rowActionIcon} weight={500} opticalSize={20} />
                      </button>

                      <button
                        type="button"
                        className={`${styles.iconAction} ${styles.deleteAction}`}
                        aria-label={`Eliminar ${template.name}`}
                        onClick={() => openDeleteModal(template)}
                      >
                        <MaterialSymbol name="delete" className={styles.rowActionIcon} weight={500} opticalSize={20} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <footer className={styles.libraryFooter}>
              <p>
                Mostrando {templates.length} plantilla{templates.length === 1 ? "" : "s"}
              </p>

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

      {activeTemplate ? (
        <div className={styles.modalOverlay} role="presentation" onClick={closeEditModal}>
          <div
            className={styles.editModal}
            role="dialog"
            aria-modal="true"
            aria-label={`Editar plantilla ${activeTemplate.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.modalHeader}>
              <div>
                <h2>Editar plantilla</h2>
                <p>Actualizá el nombre para mantener tu biblioteca ordenada.</p>
              </div>

              <button type="button" className={styles.modalCloseButton} aria-label="Cerrar modal" onClick={closeEditModal}>
                <MaterialSymbol name="close" className={styles.modalCloseIcon} weight={500} opticalSize={22} />
              </button>
            </header>

            <div className={styles.modalBody}>
              <label className={styles.modalField}>
                <span>Nombre de la plantilla</span>
                <input
                  type="text"
                  value={draftTemplateName}
                  onChange={(event) => setDraftTemplateName(event.target.value)}
                  placeholder="Ej: Definición 12 Semanas"
                />
              </label>
            </div>

            <footer className={styles.modalActions}>
              <button type="button" className={styles.modalCancelGhostButton} onClick={closeEditModal}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.modalConfirmButton}
                onClick={handleConfirmEdit}
                disabled={!draftTemplateName.trim()}
              >
                <MaterialSymbol name="save" className={styles.confirmIcon} fill={1} weight={500} opticalSize={18} />
                Guardar cambios
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {activeDeleteTemplate ? (
        <DestructiveConfirmationModal
          ariaLabel={`Eliminar plantilla ${activeDeleteTemplate.name}`}
          title="¿Eliminar plantilla?"
          description="Esta acción elimina la plantilla de esta biblioteca y no se puede deshacer desde esta vista."
          headerAlignment="center"
          density="compact"
          confirmLabel="Eliminar plantilla"
          onConfirm={handleConfirmDelete}
          onCancel={closeDeleteModal}
          targetCard={
            <>
              <div>
                <small>Rutinas</small>
                <strong>{activeDeleteTemplate.name}</strong>
              </div>

              <em>
                {activeDeleteTemplate.format.toUpperCase()} · {activeDeleteTemplate.size}
              </em>
            </>
          }
        />
      ) : null}
    </section>
  );
}
