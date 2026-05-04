import { useEffect, useMemo, useState, useCallback } from "react";

import styles from "@/app/(private)/rutinas/rutinas.module.css";
import {
  buildRoutinePreviewUrl,
  fetchRoutinePreviewBinary,
  type RoutineFile,
  type RoutineFileType,
} from "@/app/(private)/rutinas/runtime";
import { MaterialSymbol } from "@/components/material-symbol";
import {
  parseRoutineWorkbookPreview,
  serializeRoutineWorkbook,
  type RoutineWorkbookSheet,
  type RoutineEditableWorkbook,
} from "@/app/(private)/rutinas/spreadsheet-preview";

const isSpreadsheetType = (type: RoutineFileType) => type === "xls" || type === "xlsx";

const cloneRows = (sheets: RoutineWorkbookSheet[]): RoutineEditableWorkbook => ({
  sheets: sheets.map((sheet) => ({ ...sheet, rows: sheet.rows.map((row) => [...row]) })),
});

export const FilePreviewModal = ({
  file,
  onClose,
  onEditSave,
}: {
  file: RoutineFile;
  onClose: () => void;
  onEditSave?: (editedBuffer: ArrayBuffer, fileName: string) => void;
}) => {
  const [isLoadingSpreadsheet, setIsLoadingSpreadsheet] = useState(false);
  const [spreadsheetError, setSpreadsheetError] = useState<string | null>(null);
  const [spreadsheetSheets, setSpreadsheetSheets] = useState<RoutineWorkbookSheet[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [draftWorkbook, setDraftWorkbook] = useState<RoutineEditableWorkbook | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const previewUrl = useMemo(() => buildRoutinePreviewUrl(file.id), [file.id]);

  const isEditable = Boolean(onEditSave) && isSpreadsheetType(file.type);

  const startEditing = useCallback(() => {
    setDraftWorkbook(cloneRows(spreadsheetSheets));
    setIsEditing(true);
  }, [spreadsheetSheets]);

  const cancelEditing = useCallback(() => {
    setDraftWorkbook(null);
    setIsEditing(false);
  }, []);

  const handleCellChange = useCallback(
    (rowIndex: number, colIndex: number, value: string) => {
      setDraftWorkbook((prev) => {
        if (!prev) return prev;
        const next = {
          sheets: prev.sheets.map((sheet, si) =>
            si === activeSheetIndex
              ? {
                  ...sheet,
                  rows: sheet.rows.map((row, ri) =>
                    ri === rowIndex ? row.map((cell, ci) => (ci === colIndex ? value : cell)) : row
                  ),
                }
              : sheet
          ),
        };
        return next;
      });
    },
    [activeSheetIndex]
  );

  const handleSaveEdit = useCallback(async () => {
    if (!draftWorkbook || !onEditSave) return;

    const isLegacy = file.type === "xls";
    const bookType = isLegacy ? "xls" : "xlsx";
    const editedBuffer = serializeRoutineWorkbook(draftWorkbook, bookType);
    const originalName = file.name;

    setIsSaving(true);
    try {
      await onEditSave(editedBuffer, originalName);
      setIsEditing(false);
      setDraftWorkbook(null);
    } finally {
      setIsSaving(false);
    }
  }, [draftWorkbook, onEditSave, file.type, file.name]);

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

  // Reset edit state when file changes
  useEffect(() => {
    setIsEditing(false);
    setDraftWorkbook(null);
  }, [file.id]);

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
            <h2>{isEditing ? "Editar" : "Previsualización"}</h2>
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
                  <div className={styles.previewSheetTabs}>
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
                        {(isEditing ? draftWorkbook?.sheets[activeSheetIndex]?.rows ?? [] : activeSheet?.rows ?? []).map(
                          (row, rowIndex) => (
                            <tr key={`row-${rowIndex}`}>
                              {row.map((cell, columnIndex) => (
                                <td key={`cell-${rowIndex}-${columnIndex}`}>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      className={styles.spreadsheetCellInput}
                                      value={cell}
                                      onChange={(e) => handleCellChange(rowIndex, columnIndex, e.target.value)}
                                      aria-label={`Celda ${rowIndex + 1}, ${columnIndex + 1}`}
                                    />
                                  ) : (
                                    cell
                                  )}
                                </td>
                              ))}
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {isEditing ? (
                    <div className={styles.editToolbar}>
                      <button
                        type="button"
                        className={styles.modalConfirmButton}
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                      >
                        {isSaving ? "Guardando..." : "Guardar cambios"}
                      </button>
                      <button
                        type="button"
                        className={styles.modalCancelGhostButton}
                        onClick={cancelEditing}
                        disabled={isSaving}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    isEditable ? (
                      <div className={styles.editToolbar}>
                        <button type="button" className={styles.editExcelButton} onClick={startEditing}>
                          <MaterialSymbol name="edit" weight={500} opticalSize={18} />
                          Editar
                        </button>
                      </div>
                    ) : null
                  )}
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
