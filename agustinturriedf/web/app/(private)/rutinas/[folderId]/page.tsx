"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import styles from "@/app/(private)/rutinas/rutinas.module.css";
import { DestructiveConfirmationModal } from "@/components/destructive-confirmation-modal";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";
import { MaterialSymbol } from "@/components/material-symbol";
import {
  deleteRoutineFile,
  fetchRoutineFolderDetail,
  getRoutineUiPermissions,
  loadRoutinesViewData,
  type RoutineFile,
  type RoutineFolder,
  type RoutinesViewData,
} from "@/app/(private)/rutinas/runtime";
import { RoutineFilesList, RoutineFolderSummaryCard, formatRoutineSize } from "@/app/(private)/rutinas/view-components";

export default function RutinaFolderDetailPage() {
  const routeParams = useParams<{ folderId: string }>();
  const folderId = routeParams?.folderId ?? null;
  const [viewData, setViewData] = useState<RoutinesViewData | null>(null);
  const [folder, setFolder] = useState<RoutineFolder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [activeDeleteFile, setActiveDeleteFile] = useState<RoutineFile | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [fileActionSuccess, setFileActionSuccess] = useState<string | null>(null);

  const isStudentView = viewData?.role === "STUDENT";
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
      setIsDeletingFile(true);
      setDeleteError(null);
      setFileActionSuccess(null);

      await deleteRoutineFile(fetch, activeDeleteFile.id);
      await refreshFolder();

      setActiveDeleteFile(null);
      setFileActionSuccess("Archivo eliminado correctamente.");
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
          <>
            <Link href="/rutinas" className={styles.backToRoutinesLink}>
              <MaterialSymbol name="arrow_back" className={styles.backToRoutinesIcon} weight={500} opticalSize={20} />
              Volver a rutinas
            </Link>

            <section className={styles.libraryColumn}>
              <header className={styles.libraryHeader}>
                <h2>{folder.displayName}</h2>
              </header>

              <RoutineFolderSummaryCard folder={folder} />

              {fileActionSuccess ? <p className={styles.feedbackSuccess}>{fileActionSuccess}</p> : null}
              {deleteError ? <p className={styles.feedbackError}>{deleteError}</p> : null}

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
    </section>
  );
}
