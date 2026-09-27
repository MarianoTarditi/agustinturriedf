import { useMemo, useRef, useState, type ChangeEvent } from "react";

import styles from "@/app/(private)/rutinas/rutinas.module.css";
import { validateRoutineFileForUpload } from "@/app/(private)/rutinas/runtime";
import { MaterialSymbol } from "@/components/material-symbol";

type QueuedRoutineUpload = {
  id: string;
  file: File;
  sizeLabel: string;
};

const formatUploadSize = (sizeBytes: number) => {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 102.4) / 10} KB`;
  return `${Math.round(sizeBytes / 1024 / 102.4) / 10} MB`;
};

export const RoutineUploadModal = ({
  isSubmitting,
  onClose,
  onSubmit,
}: {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (files: File[]) => Promise<void>;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [queue, setQueue] = useState<QueuedRoutineUpload[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = queue.length > 0 && !isSubmitting;
  const queueReadyMessage =
    queue.length > 0
      ? `${queue.length} archivo${queue.length === 1 ? "" : "s"} listo${queue.length === 1 ? "" : "s"} para subir.`
      : null;

  const queuedFiles = useMemo(() => queue.map((entry) => entry.file), [queue]);

  const handleOpenPicker = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.currentTarget.files;

    if (!selected || selected.length === 0) return;

    const accepted: QueuedRoutineUpload[] = [];
    const rejected: string[] = [];

    Array.from(selected).forEach((file) => {
      const validation = validateRoutineFileForUpload(file);

      if (!validation.ok) {
        rejected.push(`${file.name}: ${validation.error}`);
        return;
      }

      accepted.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        sizeLabel: formatUploadSize(file.size),
      });
    });

    if (accepted.length > 0) {
      setQueue((current) => [...current, ...accepted]);
    }

    if (rejected.length > 0) {
      setErrorMessage(rejected.join(" "));
    } else {
      setErrorMessage(null);
    }

    event.currentTarget.value = "";
  };

  const handleRemove = (id: string) => {
    if (isSubmitting) return;
    setQueue((current) => current.filter((entry) => entry.id !== id));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setErrorMessage(null);

    try {
      await onSubmit(queuedFiles);
      setQueue([]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudieron subir los archivos.");
    }
  };

  return (
    <div className={styles.modalOverlay} role="presentation" onClick={onClose}>
      <section
        className={`${styles.editModal} ${styles.routineUploadModal}`}
        role="dialog"
        aria-modal="true"
        aria-label="Subir archivos de rutina"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <div>
            <h2>Subir archivos</h2>
            <p>Podés seleccionar varios PDF/XLS/XLSX en una sola acción.</p>
          </div>

          <button type="button" className={styles.modalCloseButton} aria-label="Cerrar modal" onClick={onClose} disabled={isSubmitting}>
            <MaterialSymbol name="close" className={styles.modalCloseIcon} weight={500} opticalSize={20} />
          </button>
        </header>

        <div className={styles.modalBody}>
          <div className={styles.routineUploadHeaderActions}>
            <button type="button" className={styles.detailUploadButton} onClick={handleOpenPicker} disabled={isSubmitting}>
              <MaterialSymbol
                name={isSubmitting ? "progress_activity" : "attach_file"}
                className={`${styles.detailUploadButtonIcon} ${isSubmitting ? styles.uploadButtonIconLoading : ""}`}
                fill={1}
                weight={500}
                opticalSize={18}
              />
              Seleccionar archivos
            </button>

            <input
              ref={inputRef}
              type="file"
              className={styles.routineUploadInput}
              accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              multiple
              onChange={handleInputChange}
              aria-label="Seleccionar archivos de rutina"
            />
          </div>

          {errorMessage ? <p className={styles.feedbackError}>{errorMessage}</p> : null}
          {queueReadyMessage ? <p className={styles.feedbackSuccess}>{queueReadyMessage}</p> : null}

          <div className={styles.routineUploadQueueList}>
            {queue.length === 0 ? <p className={styles.feedbackInfo}>No hay archivos en cola.</p> : null}

            {queue.map((entry) => (
              <article key={entry.id} className={styles.routineUploadQueueItem}>
                <div className={styles.routineUploadQueueMeta}>
                  <strong>{entry.file.name}</strong>
                  <p>{entry.sizeLabel}</p>
                </div>

                <button
                  type="button"
                  className={styles.iconAction}
                  aria-label={`Quitar ${entry.file.name}`}
                  onClick={() => handleRemove(entry.id)}
                  disabled={isSubmitting}
                >
                  <MaterialSymbol name="delete" className={styles.rowActionIcon} weight={500} opticalSize={20} />
                </button>
              </article>
            ))}
          </div>
        </div>

        <footer className={styles.modalActions}>
          <button type="button" className={styles.modalCancelGhostButton} onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>

          <button type="button" className={styles.modalConfirmButton} onClick={handleSubmit} disabled={!canSubmit}>
            <MaterialSymbol
              name={isSubmitting ? "progress_activity" : "cloud_upload"}
              className={`${styles.confirmIcon} ${isSubmitting ? styles.uploadButtonIconLoading : ""}`}
              fill={1}
              weight={500}
              opticalSize={18}
            />
            {isSubmitting ? "Subiendo..." : "Subir"}
          </button>
        </footer>
      </section>
    </div>
  );
};
