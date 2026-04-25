import { useEffect, useMemo, useState } from "react";

import styles from "@/app/(private)/rutinas/rutinas.module.css";
import {
  buildRoutinePreviewUrl,
  fetchRoutinePreviewBinary,
  type RoutineFile,
  type RoutineFileType,
} from "@/app/(private)/rutinas/runtime";
import { MaterialSymbol } from "@/components/material-symbol";
import { parseRoutineWorkbookPreview, type RoutineWorkbookSheet } from "@/app/(private)/rutinas/spreadsheet-preview";

const isSpreadsheetType = (type: RoutineFileType) => type === "xls" || type === "xlsx";

export const FilePreviewModal = ({
  file,
  onClose,
}: {
  file: RoutineFile;
  onClose: () => void;
}) => {
  const [isLoadingSpreadsheet, setIsLoadingSpreadsheet] = useState(false);
  const [spreadsheetError, setSpreadsheetError] = useState<string | null>(null);
  const [spreadsheetSheets, setSpreadsheetSheets] = useState<RoutineWorkbookSheet[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  const previewUrl = useMemo(() => buildRoutinePreviewUrl(file.id), [file.id]);

  useEffect(() => {
    if (!isSpreadsheetType(file.type)) {
      setIsLoadingSpreadsheet(false);
      setSpreadsheetError(null);
      setSpreadsheetSheets([]);
      setActiveSheetIndex(0);
      return;
    }

    let cancelled = false;

    const loadSpreadsheet = async () => {
      try {
        setIsLoadingSpreadsheet(true);
        setSpreadsheetError(null);
        setSpreadsheetSheets([]);
        setActiveSheetIndex(0);

        const binary = await fetchRoutinePreviewBinary(fetch, file.id);
        if (cancelled) return;

        const workbook = parseRoutineWorkbookPreview(binary);
        setSpreadsheetSheets(workbook.sheets);
      } catch (error) {
        if (!cancelled) {
          setSpreadsheetError(error instanceof Error ? error.message : "No se pudo cargar la previsualización de Excel.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSpreadsheet(false);
        }
      }
    };

    void loadSpreadsheet();

    return () => {
      cancelled = true;
    };
  }, [file.id, file.type]);

  const activeSheet = spreadsheetSheets[activeSheetIndex] ?? null;

  return (
    <div className={styles.modalOverlay} role="presentation" onClick={onClose}>
      <section
        className={`${styles.editModal} ${styles.previewModal}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Previsualización de ${file.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <div>
            <h2>Previsualización</h2>
            <p>{file.name}</p>
          </div>

          <button type="button" className={styles.modalCloseButton} aria-label="Cerrar previsualización" onClick={onClose}>
            <MaterialSymbol name="close" className={styles.modalCloseIcon} weight={500} opticalSize={20} />
          </button>
        </header>

        <div className={`${styles.modalBody} ${styles.previewModalBody}`}>
          {file.type === "pdf" ? (
            <iframe className={styles.previewPdfFrame} src={previewUrl} title={`PDF ${file.name}`} />
          ) : null}

          {isSpreadsheetType(file.type) ? (
            <div className={styles.previewSpreadsheetWrap}>
              {isLoadingSpreadsheet ? <p className={styles.feedbackInfo}>Cargando previsualización...</p> : null}
              {!isLoadingSpreadsheet && spreadsheetError ? <p className={styles.feedbackError}>{spreadsheetError}</p> : null}

              {!isLoadingSpreadsheet && !spreadsheetError && spreadsheetSheets.length === 0 ? (
                <p className={styles.feedbackInfo}>No se encontraron hojas para mostrar.</p>
              ) : null}

              {!isLoadingSpreadsheet && !spreadsheetError && spreadsheetSheets.length > 0 ? (
                <>
                  <div className={styles.previewSheetTabs} role="tablist" aria-label="Hojas del archivo">
                    {spreadsheetSheets.map((sheet, index) => (
                      <button
                        key={sheet.name}
                        type="button"
                        role="tab"
                        className={`${styles.previewSheetTab} ${index === activeSheetIndex ? styles.previewSheetTabActive : ""}`}
                        aria-selected={index === activeSheetIndex}
                        onClick={() => setActiveSheetIndex(index)}
                      >
                        {sheet.name}
                      </button>
                    ))}
                  </div>

                  <div className={styles.previewSpreadsheetTableWrap}>
                    <table className={styles.previewSpreadsheetTable}>
                      <tbody>
                        {(activeSheet?.rows ?? []).map((row, rowIndex) => (
                          <tr key={`row-${rowIndex}`}>
                            {row.map((cell, columnIndex) => (
                              <td key={`cell-${rowIndex}-${columnIndex}`}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {file.type !== "pdf" && !isSpreadsheetType(file.type) ? (
            <p className={styles.feedbackInfo}>Este tipo de archivo no tiene previsualización disponible.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
};
