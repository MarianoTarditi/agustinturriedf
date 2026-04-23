"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "@/app/(private)/rutinas/rutinas.module.css";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";
import { loadRoutinesViewData, type RoutinesViewData } from "@/app/(private)/rutinas/runtime";
import {
  RoutineFolderGrid,
  RoutineFolderSummaryCard,
  type RoutineFolderViewMode,
} from "@/app/(private)/rutinas/view-components";
import {
  deriveRoutineFolders,
  type RoutineFolderFilter,
  type RoutineFolderSort,
} from "@/app/(private)/rutinas/page-derived-list";

const SORT_OPTIONS: { value: RoutineFolderSort; label: string }[] = [
  { value: "recent", label: "Más recientes" },
  { value: "alphabetical", label: "A-Z" },
  { value: "more-files", label: "Más archivos" },
];

const FILTER_OPTIONS: { value: RoutineFolderFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "with-files", label: "Con archivos" },
  { value: "without-files", label: "Sin archivos" },
];

export default function RutinasPage() {
  const [viewData, setViewData] = useState<RoutinesViewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<RoutineFolderSort>("recent");
  const [filterBy, setFilterBy] = useState<RoutineFolderFilter>("all");
  const [viewMode, setViewMode] = useState<RoutineFolderViewMode>("grid");
  const [query, setQuery] = useState("");

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

  const derivedFolders = useMemo(() => deriveRoutineFolders(folders, { query, sortBy, filterBy }), [filterBy, folders, query, sortBy]);

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
            </header>

            <section className={styles.controlsRow}>
              <div className={styles.controlsMain}>
                <label className={styles.searchWrap}>
                  <MaterialSymbol name="search" className={styles.searchIcon} weight={420} opticalSize={18} />
                  <input
                    type="search"
                    placeholder="Buscar alumno por nombre o email..."
                    aria-label="Buscar alumno por nombre o email"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>

                <label className={styles.sortWrap}>
                  <span className={styles.controlLabel}>Ordenar</span>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as RoutineFolderSort)}
                    aria-label="Ordenar carpetas"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <MaterialSymbol name="expand_more" className={styles.selectIcon} weight={500} opticalSize={18} />
                </label>

                <label className={styles.sortWrap}>
                  <span className={styles.controlLabel}>Filtrar</span>
                  <select
                    value={filterBy}
                    onChange={(event) => setFilterBy(event.target.value as RoutineFolderFilter)}
                    aria-label="Filtrar carpetas"
                  >
                    {FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <MaterialSymbol name="expand_more" className={styles.selectIcon} weight={500} opticalSize={18} />
                </label>
              </div>

              <div className={styles.viewToggle} role="group" aria-label="Cambiar vista de carpetas">
                <button
                  type="button"
                  className={`${styles.viewButton} ${viewMode === "grid" ? styles.viewButtonActive : ""}`}
                  aria-label="Vista de grilla"
                  onClick={() => setViewMode("grid")}
                >
                  <MaterialSymbol name="grid_view" className={styles.viewIcon} weight={500} opticalSize={20} />
                </button>
                <button
                  type="button"
                  className={`${styles.viewButton} ${viewMode === "list" ? styles.viewButtonActive : ""}`}
                  aria-label="Vista de lista"
                  onClick={() => setViewMode("list")}
                >
                  <MaterialSymbol name="view_list" className={styles.viewIcon} weight={500} opticalSize={20} />
                </button>
              </div>
            </section>

            {folders.length === 0 ? <p className={styles.feedbackInfo}>Todavía no hay carpetas de alumnos.</p> : null}
            {folders.length > 0 && derivedFolders.length === 0 ? (
              <p className={styles.feedbackInfo}>
                {query.trim().length > 0
                  ? "No hay carpetas que coincidan con la búsqueda y filtros seleccionados."
                  : "No hay carpetas que coincidan con el filtro seleccionado."}
              </p>
            ) : null}

            <RoutineFolderGrid folders={derivedFolders} viewMode={viewMode} />
          </section>
        ) : null}
      </div>

      <div className={styles.localGlowPrimary} aria-hidden="true" />
      <div className={styles.localGlowSecondary} aria-hidden="true" />
    </section>
  );
}
