"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "@/app/(private)/rutinas/rutinas.module.css";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";
import { loadRoutinesViewData, type RoutinesViewData } from "@/app/(private)/rutinas/runtime";
import { RoutineFolderGrid, RoutineFolderSummaryCard } from "@/app/(private)/rutinas/view-components";

export default function RutinasPage() {
  const [viewData, setViewData] = useState<RoutinesViewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const isStudentView = viewData?.role === "STUDENT";
  const isStaffView = viewData?.role === "STAFF";

  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setLoadingError(null);

        const nextViewData = await loadRoutinesViewData(fetch);

        if (cancelled) return;

        setViewData(nextViewData);
      } catch (error) {
        if (!cancelled) {
          setLoadingError(error instanceof Error ? error.message : "No se pudo cargar rutinas.");
          setViewData(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  const folders = useMemo(() => {
    if (!isStaffView || !viewData) return [];
    return viewData.folders;
  }, [isStaffView, viewData]);

  const studentFolder = isStudentView ? viewData?.folder ?? null : null;

  return (
    <section className={styles.page}>
      <PrivateBreadcrumb current="Rutinas" />
      <PrivateTopbar
        title="Gestión de Rutinas"
        subtitle="Explorá carpetas de alumnos y entrá al detalle para gestionar archivos de rutinas."
      />

      <div className={styles.content}>
        {isLoading ? <p className={styles.feedbackInfo}>Cargando rutinas...</p> : null}
        {!isLoading && loadingError ? <p className={styles.feedbackError}>{loadingError}</p> : null}

        {!isLoading && !loadingError && isStudentView ? (
          <section className={styles.libraryColumn}>
            <header className={styles.libraryHeader}>
              <h2>Mi carpeta</h2>
            </header>

            {studentFolder ? (
              <>
                <RoutineFolderSummaryCard folder={studentFolder} />
                <p className={styles.feedbackInfo}>Entrá a la carpeta para ver tus archivos.</p>
                <div className={styles.rowActions}>
                  <Link href={`/rutinas/${studentFolder.id}`} className={styles.openButton}>
                    Abrir carpeta
                  </Link>
                </div>
              </>
            ) : (
              <p className={styles.feedbackInfo}>No se encontró tu carpeta de rutinas.</p>
            )}
          </section>
        ) : null}

        {!isLoading && !loadingError && isStaffView ? (
          <section className={styles.folderColumn}>
            <header className={styles.libraryHeader}>
              <h2>Carpetas de alumnos</h2>
            </header>

            {folders.length === 0 ? <p className={styles.feedbackInfo}>Todavía no hay carpetas de alumnos.</p> : null}
            <RoutineFolderGrid folders={folders} />
          </section>
        ) : null}
      </div>

      <div className={styles.localGlowPrimary} aria-hidden="true" />
      <div className={styles.localGlowSecondary} aria-hidden="true" />
    </section>
  );
}
