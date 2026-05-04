"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import styles from "@/app/(private)/rutinas/rutinas.module.css";
import { useLoading } from "@/components/use-loading";
import { DestructiveConfirmationModal } from "@/components/destructive-confirmation-modal";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";
import { MaterialSymbol } from "@/components/material-symbol";
import {
  deleteRoutineFile,
  fetchRoutineFolderDetail,
  getRoutineUiPermissions,
  loadRoutinesViewData,
  replaceRoutineFile,
  uploadRoutineFiles,
  type RoutineFile,
  type RoutineFolder,
  type RoutinesViewData,
} from "@/app/(private)/rutinas/runtime";
import { FilePreviewModal } from "@/app/(private)/rutinas/file-preview-modal";
import { RoutineReplaceModal } from "@/app/(private)/rutinas/routine-replace-modal";
import { RoutineUploadModal } from "@/app/(private)/rutinas/routine-upload-modal";
import { RoutineFilesList, RoutineFolderSummaryCard, formatRoutineSize } from "@/app/(private)/rutinas/view-components";
import {
  ROUTINE_FILES_PAGE_SIZE,
  clampRoutineFilesPage,
  getRoutineFilePage,
  getRoutineFilesTotalPages,
} from "@/app/(private)/rutinas/folder-detail-pagination";
import { filterRoutineFiles } from "@/app/(private)/rutinas/folder-detail-filter";

export default function RutinaFolderDetailPage() {
  const routeParams = useParams<{ folderId: string }>();
  const folderId = routeParams?.folderId ?? null;
  const { showLoader, hideLoader, updateProgress } = useLoading();
  const [viewData, setViewData] = useState<RoutinesViewData | null>(null);
  const [folder, setFolder] = useState<RoutineFolder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [activeDeleteFile, setActiveDeleteFile] = useState<RoutineFile | null>(null);
  const [activePreviewFile, setActivePreviewFile] = useState<RoutineFile | null>(null);
  const [activeReplaceFile, setActiveReplaceFile] = useState<RoutineFile | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [fileActionSuccess, setFileActionSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [fileQuery, setFileQuery] = useState("");

  const isStudentView = viewData?.role === "STUDENT";
  const routinePermissions = getRoutineUiPermissions(viewData);

  useEffect(() => {
    if (!folderId) return;

    let cancelled = false;

    showLoader("rutina-detail-load", { text: "Cargando rutina..." });

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

      } catch (error) {
        if (!cancelled) {
          setLoadingError(error instanceof Error ? error.message : "No se pudo cargar la carpeta.");
          setFolder(null);
        }
      } finally {
        if (!cancelled) {
          hideLoader("rutina-detail-load");
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
  const filteredFiles = useMemo(() => filterRoutineFiles(files, fileQuery), [files, fileQuery]);
  const pagination = useMemo(
    () => getRoutineFilePage(filteredFiles, currentPage, ROUTINE_FILES_PAGE_SIZE),
    [filteredFiles, currentPage],
  );
  const hasPrevPage = pagination.currentPage > 1;
  const hasNextPage = pagination.currentPage < pagination.totalPages;

  useEffect(() => {
    setCurrentPage((page) => clampRoutineFilesPage(page, getRoutineFilesTotalPages(filteredFiles.length, ROUTINE_FILES_PAGE_SIZE)));
  }, [filteredFiles.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [fileQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [folderId]);

  const refreshFolder = async () => {
    if (!folderId) return;

    const refreshedFolder = await fetchRoutineFolderDetail(fetch, folderId);
    setFolder(refreshedFolder);

  };

  const handleDeleteFile = async () => {
    if (!activeDeleteFile || isDeletingFile || !routinePermissions.canDeleteFiles) {
      return;
    }

    try {
      setDeleteError(null);
      setFileActionSuccess(null);

      showLoader("rutinas-file-delete", { text: "Eliminando archivo..." });
      await deleteRoutineFile(fetch, activeDeleteFile.id);
      await refreshFolder();

      setActiveDeleteFile(null);
      setFileActionSuccess("Archivo eliminado correctamente.");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "No se pudo eliminar el archivo.");
    } finally {
      hideLoader("rutinas-file-delete");
      setIsDeletingFile(false);
    }
  };

  const handlePrevPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((page) => Math.min(page + 1, pagination.totalPages));
  };

  const handleEditSpreadsheet = async (editedBuffer: ArrayBuffer, fileName: string) => {
    if (!activePreviewFile || !folderId) return;

    const extension = activePreviewFile.type === "xls" ? "xls" : "xlsx";
    const editedFile = new File([editedBuffer], fileName, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    try {
      setDeleteError(null);
      setFileActionSuccess(null);

      showLoader("rutinas-spreadsheet-save", { text: "Guardando planilla..." });
      const replacedFile = await replaceRoutineFile(fetch, folderId, activePreviewFile.id, editedFile);

      setFolder((current) => {
        if (!current) return current;
        return {
          ...current,
          files: current.files.map((f) => (f.id === replacedFile.id ? replacedFile : f)),
        };
      });

      setActivePreviewFile(null);
      setFileActionSuccess(`Archivo "${replacedFile.name}" guardado correctamente.`);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "No se pudo guardar el archivo.");
    } finally {
      hideLoader("rutinas-spreadsheet-save");
      setIsSavingEdit(false);
    }
  };

  const handleReplaceFile = async (file: File) => {
    if (!activeReplaceFile || !folderId || isUploadingFiles) return;

    try {
      setDeleteError(null);
      setFileActionSuccess(null);

      showLoader("rutinas-file-replace", { text: "Reemplazando archivo..." });
      const replacedFile = await replaceRoutineFile(fetch, folderId, activeReplaceFile.id, file);

      setFolder((current) => {
        if (!current) return current;
        return {
          ...current,
          files: current.files.map((f) => (f.id === replacedFile.id ? replacedFile : f)),
        };
      });

      setActiveReplaceFile(null);
      setFileActionSuccess(`Archivo "${replacedFile.name}" reemplazado correctamente.`);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "No se pudo reemplazar el archivo.");
    } finally {
      hideLoader("rutinas-file-replace");
      setIsUploadingFiles(false);
    }
  };

  const handleUploadFiles = async (filesToUpload: File[]) => {
    if (!folderId || isUploadingFiles) return;

    showLoader('rutinas-upload', { text: 'Subiendo archivo...' });

    try {
      setIsUploadingFiles(true);
      setDeleteError(null);
      setFileActionSuccess(null);

      const uploadedFiles = await uploadRoutineFiles(fetch, folderId, filesToUpload);

      if (uploadedFiles.length > 0) {
        setFolder((current) => {
          if (!current) return current;

          const existingById = new Map(current.files.map((file) => [file.id, file]));
          uploadedFiles.forEach((file) => {
            existingById.set(file.id, file);
          });

          return {
            ...current,
            files: Array.from(existingById.values()),
            fileCount: existingById.size,
          };
        });
      }

      setIsUploadModalOpen(false);
      setFileActionSuccess(
        uploadedFiles.length === 1
          ? "Archivo subido correctamente."
          : `${uploadedFiles.length} archivos subidos correctamente.`
      );
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "No se pudieron subir los archivos.");
    } finally {
      hideLoader('rutinas-upload');
      setIsUploadingFiles(false);
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
          <>
            <section className={styles.libraryColumn}>
              <header className={styles.detailHeaderRow}>
                <div className={styles.detailHeaderMain}>
                  <Link href="/rutinas" className={styles.detailBackButton}>
                    <MaterialSymbol name="arrow_back" className={styles.detailBackIcon} weight={500} opticalSize={18} />
                    Volver a rutinas
                  </Link>
                </div>

                <div className={styles.detailHeaderActions}>
                  {routinePermissions.canUploadFiles ? (
                    <button
                      type="button"
                      className={styles.detailHeaderUploadButton}
                      onClick={() => {
                        setDeleteError(null);
                        setFileActionSuccess(null);
                        setIsUploadModalOpen(true);
                      }}
                    >
                      <MaterialSymbol name="upload_file" className={styles.detailHeaderUploadButtonIcon} fill={1} weight={500} opticalSize={20} />
                      Subir archivo
                    </button>
                  ) : null}
                </div>
              </header>

              <RoutineFolderSummaryCard folder={folder} />

              {fileActionSuccess ? <p className={styles.feedbackSuccess}>{fileActionSuccess}</p> : null}
              {deleteError ? <p className={styles.feedbackError}>{deleteError}</p> : null}

              <div className={styles.detailSearchWrap}>
                <MaterialSymbol name="search" className={styles.detailSearchIcon} weight={300} opticalSize={20} />
                <input
                  type="search"
                  name="fileSearch"
                  className={styles.detailSearchInput}
                  placeholder="Buscar archivo por nombre o tipo..."
                  aria-label="Buscar archivo por nombre o tipo"
                  value={fileQuery}
                  onChange={(e) => setFileQuery(e.target.value)}
                />
              </div>

              {filteredFiles.length === 0 && fileQuery.trim().length > 0 ? (
                <p className={styles.feedbackInfo}>No hay archivos que coincidan con la búsqueda.</p>
              ) : null}

              <RoutineFilesList
                files={pagination.visibleFiles}
                canDeleteFiles={routinePermissions.canDeleteFiles}
                onPreview={(file) => {
                  setDeleteError(null);
                  setFileActionSuccess(null);
                  setActivePreviewFile(file);
                }}
                onDelete={(file) => {
                  setDeleteError(null);
                  setActiveDeleteFile(file);
                }}
                {...(routinePermissions.canReplaceFiles
                  ? {
                      onReplace: (file) => {
                        setDeleteError(null);
                        setFileActionSuccess(null);
                        setActiveReplaceFile(file);
                      },
                    }
                  : {})}
                emptyMessage={
                  isStudentView ? "Todavía no tenés rutinas cargadas." : "Esta carpeta todavía no tiene archivos."
                }
              />

              {pagination.totalPages > 1 ? (
                <footer className={styles.detailPagination} aria-label="Paginación de archivos de rutina">
                  <p className={styles.detailPaginationStatus}>
                    Página {pagination.currentPage} de {pagination.totalPages}
                  </p>

                  <div className={styles.detailPaginationControls}>
                    <button
                      type="button"
                      className={styles.detailPaginationButton}
                      onClick={handlePrevPage}
                      disabled={!hasPrevPage}
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      className={styles.detailPaginationButton}
                      onClick={handleNextPage}
                      disabled={!hasNextPage}
                    >
                      Siguiente
                    </button>
                  </div>
                </footer>
              ) : null}
            </section>
          </>
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

      {activePreviewFile ? (
        <FilePreviewModal
          file={activePreviewFile}
          onClose={() => {
            setActivePreviewFile(null);
          }}
          onEditSave={routinePermissions.canEditFiles ? handleEditSpreadsheet : undefined}
        />
      ) : null}

      {isUploadModalOpen && routinePermissions.canUploadFiles ? (
        <RoutineUploadModal
          isSubmitting={isUploadingFiles}
          onClose={() => {
            if (isUploadingFiles) return;
            setIsUploadModalOpen(false);
          }}
          onSubmit={handleUploadFiles}
        />
      ) : null}

      {activeReplaceFile ? (
        <RoutineReplaceModal
          file={activeReplaceFile}
          isSubmitting={isUploadingFiles}
          onClose={() => {
            if (isUploadingFiles) return;
            setActiveReplaceFile(null);
          }}
          onSubmit={handleReplaceFile}
        />
      ) : null}
    </section>
  );
}
