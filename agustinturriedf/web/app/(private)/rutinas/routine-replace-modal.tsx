import { useMemo, useRef, useState, type ChangeEvent } from "react";

import styles from "@/app/(private)/rutinas/rutinas.module.css";
import { validateRoutineFileForUpload } from "@/app/(private)/rutinas/runtime";
import { MaterialSymbol } from "@/components/material-symbol";
import type { RoutineFile } from "@/app/(private)/rutinas/runtime";

const formatUploadSize = (sizeBytes: number) => {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 102.4) / 10} KB`;
  return `${Math.round(sizeBytes / 1024 / 102.4) / 10} MB`;
};

export const RoutineReplaceModal = ({
  file,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  file: RoutineFile;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (file: File) => Promise<void>;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = selectedFile !== null && !isSubmitting;

  const handleOpenPicker = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.currentTarget.files?.[0];

    if (!selected) return;

    const validation = validateRoutineFileForUpload(selected);

    if (!validation.ok) {
      setErrorMessage(validation.error);
      setSelectedFile(null);
      event.currentTarget.value = "";
      return;
    }

    setErrorMessage(null);
    setSelectedFile(selected);
    event.currentTarget.value = "";
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedFile) return;

    setErrorMessage(null);

    try {
      await onSubmit(selectedFile);
      setSelectedFile(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo reemplazar el archivo.");
    }
  };

  return (
    <div className={styles.modalOverlay} role="presentation" onClick={onClose}>
      <section
        className={`${styles.editModal} ${styles.routineReplaceModal}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Reemplazar archivo ${file.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <div>
            <h2>Reemplazar archivo</h2>
            <p>Solo se permiten archivos PDF, XLS y XLSX.</p>
          </div>

          <button type="button" className={styles.modalCloseButton} aria-label="Cerrar modal" onClick={onClose} disabled={isSubmitting}>
            <MaterialSymbol name="close" className={styles.modalCloseIcon} weight={500} opticalSize={20} />
          </button>
        </header>

        <div className={styles.modalBody}>
          <div className={styles.replaceCurrentFileInfo}>
            <div className={styles.replaceCurrentFileMeta}>
              <strong>{file.name}</strong>
              <p>{file.type.toUpperCase()} · {formatUploadSize(file.sizeBytes)}</p>
            </div>
          </div>

          <div className={styles.routineUploadHeaderActions}>
            <button type="button" className={styles.detailUploadButton} onClick={handleOpenPicker} disabled={isSubmitting}>
              <MaterialSymbol
                name={isSubmitting ? "progress_activity" : "attach_file"}
                className={`${styles.detailUploadButtonIcon} ${isSubmitting ? styles.uploadButtonIconLoading : ""}`}
                fill={1}
                weight={500}
                opticalSize={18}
              />
              Seleccionar archivo de reemplazo
            </button>

            <input
              ref={inputRef}
              type="file"
              className={styles.routineUploadInput}
              accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleInputChange}
              aria-label="Seleccionar archivo de reemplazo"
            />
          </div>

          {errorMessage ? <p className={styles.feedbackError}>{errorMessage}</p> : null}

          {selectedFile ? (
            <div className={styles.replaceSelectedFileInfo}>
              <div className={styles.replaceSelectedFileMeta}>
                <strong>{selectedFile.name}</strong>
                <p>{formatUploadSize(selectedFile.size)}</p>
              </div>
            </div>
          ) : null}
        </div>

        <footer className={styles.modalActions}>
          <button type="button" className={styles.modalCancelGhostButton} onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>

          <button type="button" className={styles.modalConfirmButton} onClick={handleSubmit} disabled={!canSubmit}>
            <MaterialSymbol
              name={isSubmitting ? "progress_activity" : "edit"}
              className={`${styles.confirmIcon} ${isSubmitting ? styles.uploadButtonIconLoading : ""}`}
              fill={1}
              weight={500}
              opticalSize={18}
            />
            {isSubmitting ? "Reemplazando..." : "Reemplazar"}
          </button>
        </footer>
      </section>
    </div>
  );
};
