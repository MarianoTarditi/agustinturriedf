"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import styles from "@/app/(private)/rutinas/rutinas.module.css";
import { DestructiveConfirmationModal } from "@/components/destructive-confirmation-modal";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";
import { MaterialSymbol } from "@/components/material-symbol";
import {
  DEFAULT_MAX_UPLOAD_BYTES,
  deleteRoutineFile,
  fetchRoutineFolderDetail,
  fetchRoutineFolders,
  getRoutineUiPermissions,
  loadRoutinesViewData,
  uploadRoutineFile,
  validateRoutineUpload,
  type RoutineFile,
  type RoutineFolder,
  type RoutinesViewData,
} from "@/app/(private)/rutinas/runtime";
import { RoutineFilesList, RoutineFolderGrid, RoutineFolderSummaryCard, formatRoutineSize } from "@/app/(private)/rutinas/view-components";

type UploadState = {
  file: File | null;
  observations: string;
  loading: boolean;
  error: string | null;
  success: string | null;
};

const initialUploadState: UploadState = {
  file: null,
  observations: "",
  loading: false,
  error: null,
  success: null,
};

export default function RutinaFolderDetailPage() {
  const routeParams = useParams<{ folderId: string }>();
  const folderId = routeParams?.folderId ?? null;
  const [viewData, setViewData] = useState<RoutinesViewData | null>(null);
  const [folder, setFolder] = useState<RoutineFolder | null>(null);
  const [folderGrid, setFolderGrid] = useState<RoutineFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>(initialUploadState);
  const [activeDeleteFile, setActiveDeleteFile] = useState<RoutineFile | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isStudentView = viewData?.role === "STUDENT";
  const isStaffView = viewData?.role === "STAFF";
  const routinePermissions = getRoutineUiPermissions(viewData);

  useEffect(() => {
    if (!folderId) return;

    let cancelled = false;

    const loadDetail = async () => {
      try {
        setIsLoading(true);
        setLoadingError(null);

        const nextViewData = await loadRoutinesViewData(fetch);
        if (cancelled) return;
        setViewData(nextViewData);

        const nextFolder = await fetchRoutineFolderDetail(fetch, folderId);
        if (cancelled) return;
        setFolder(nextFolder);

        if (nextViewData.role === "STAFF") {
          const folders = await fetchRoutineFolders(fetch);
          if (!cancelled) {
            setFolderGrid(folders);
          }
        } else {
          setFolderGrid([]);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadingError(error instanceof Error ? error.message : "No se pudo cargar la carpeta.");
          setFolder(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [folderId]);

  const files = useMemo(() => folder?.files ?? [], [folder]);

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setUploadState((current) => ({
        ...current,
        file: null,
        error: null,
        success: null,
      }));
      return;
    }

    const validationError = validateRoutineUpload(file, DEFAULT_MAX_UPLOAD_BYTES);

    if (validationError) {
      setUploadState((current) => ({
        ...current,
        file: null,
        error: validationError,
        success: null,
      }));
      return;
    }

    setUploadState((current) => ({
      ...current,
      file,
      error: null,
      success: null,
    }));
  };

  const refreshFolder = async () => {
    if (!folderId) return;

    const refreshedFolder = await fetchRoutineFolderDetail(fetch, folderId);
    setFolder(refreshedFolder);

    if (isStaffView) {
      const refreshedGrid = await fetchRoutineFolders(fetch);
      setFolderGrid(refreshedGrid);
    }
  };

  const handleUpload = async () => {
    if (!folder || !uploadState.file || uploadState.loading || !routinePermissions.canUploadFiles) {
      return;
    }

    try {
      setUploadState((current) => ({ ...current, loading: true, error: null, success: null }));

      await uploadRoutineFile(fetch, {
        folderId: folder.id,
        file: uploadState.file,
        observations: uploadState.observations,
      });

      await refreshFolder();

      setUploadState({
        file: null,
        observations: "",
        loading: false,
        error: null,
        success: "Archivo subido correctamente.",
      });
    } catch (error) {
      setUploadState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : "No se pudo subir el archivo.",
        success: null,
      }));
    }
  };

  const handleDeleteFile = async () => {
    if (!activeDeleteFile || isDeletingFile || !routinePermissions.canDeleteFiles) {
      return;
    }

    try {
      setIsDeletingFile(true);
      setDeleteError(null);

      await deleteRoutineFile(fetch, activeDeleteFile.id);
      await refreshFolder();

      setActiveDeleteFile(null);
      setUploadState((current) => ({ ...current, success: "Archivo eliminado correctamente." }));
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "No se pudo eliminar el archivo.");
    } finally {
      setIsDeletingFile(false);
    }
  };

  return (
    <section className={styles.page}>
      <PrivateBreadcrumb current="Detalle de Rutinas" />
      <PrivateTopbar
        title="Detalle de Carpeta"
        subtitle="Gestioná archivos dentro de una carpeta de alumno. No hay creación ni eliminación manual de carpetas."
      />

      <div className={styles.content}>
        {isLoading ? <p className={styles.feedbackInfo}>Cargando carpeta...</p> : null}
        {!isLoading && loadingError ? <p className={styles.feedbackError}>{loadingError}</p> : null}

        {!isLoading && !loadingError && folder ? (
          <div className={styles.layoutGridStaff}>
            {isStaffView ? (
              <section className={styles.folderColumn}>
                <header className={styles.libraryHeader}>
                  <h2>Carpetas de alumnos</h2>
                </header>
                <RoutineFolderGrid folders={folderGrid} activeFolderId={folder.id} />
              </section>
            ) : null}

            <section className={styles.libraryColumn}>
              <header className={styles.libraryHeader}>
                <h2>{folder.displayName}</h2>
              </header>

              <RoutineFolderSummaryCard folder={folder} />

              {routinePermissions.canUploadFiles ? (
                <article className={styles.uploadCard}>
                  <h2>Subir archivo</h2>

                  <div className={styles.fieldGroup}>
                    <label htmlFor="routine-observations">Observaciones (opcional)</label>
                    <input
                      id="routine-observations"
                      type="text"
                      placeholder="Ej: Semana 4 - fuerza"
                      value={uploadState.observations}
                      onChange={(event) =>
                        setUploadState((current) => ({ ...current, observations: event.target.value, success: null }))
                      }
                      disabled={uploadState.loading}
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label htmlFor="routine-file">Seleccionar archivo</label>
                    <input
                      id="routine-file"
                      type="file"
                      accept=".pdf,.xls,.xlsx"
                      onChange={handleFileInput}
                      disabled={uploadState.loading}
                    />
                    <span className={styles.helperText}>Formatos permitidos: .pdf, .xls, .xlsx (máx. 15MB)</span>
                  </div>

                  {uploadState.file ? <p className={styles.feedbackInfo}>Archivo: {uploadState.file.name}</p> : null}
                  {uploadState.error ? <p className={styles.feedbackError}>{uploadState.error}</p> : null}
                  {uploadState.success ? <p className={styles.feedbackSuccess}>{uploadState.success}</p> : null}
                  {deleteError ? <p className={styles.feedbackError}>{deleteError}</p> : null}

                  <button
                    type="button"
                    className={styles.uploadButton}
                    disabled={!uploadState.file || uploadState.loading}
                    onClick={handleUpload}
                  >
                    <MaterialSymbol name="upload_file" className={styles.uploadIcon} weight={500} opticalSize={20} />
                    {uploadState.loading ? "Subiendo..." : "Subir archivo"}
                  </button>
                </article>
              ) : null}

              <RoutineFilesList
                files={files}
                canDeleteFiles={routinePermissions.canDeleteFiles}
                onDelete={(file) => {
                  setDeleteError(null);
                  setActiveDeleteFile(file);
                }}
                emptyMessage={
                  isStudentView ? "Todavía no tenés rutinas cargadas." : "Esta carpeta todavía no tiene archivos."
                }
              />
            </section>
          </div>
        ) : null}
      </div>

      <div className={styles.localGlowPrimary} aria-hidden="true" />
      <div className={styles.localGlowSecondary} aria-hidden="true" />

      {activeDeleteFile ? (
        <DestructiveConfirmationModal
          ariaLabel={`Eliminar archivo ${activeDeleteFile.name}`}
          title="¿Eliminar archivo?"
          description="Esta acción elimina el archivo de rutina de forma permanente."
          headerAlignment="center"
          density="compact"
          confirmLabel={isDeletingFile ? "Eliminando..." : "Eliminar archivo"}
          isPending={isDeletingFile}
          onConfirm={handleDeleteFile}
          onCancel={() => {
            if (isDeletingFile) return;
            setActiveDeleteFile(null);
            setDeleteError(null);
          }}
          targetCard={
            <>
              <div>
                <small>Rutinas</small>
                <strong>{activeDeleteFile.name}</strong>
              </div>

              <em>
                {activeDeleteFile.type.toUpperCase()} · {formatRoutineSize(activeDeleteFile.sizeBytes)}
              </em>
            </>
          }
        />
      ) : null}
    </section>
  );
}
