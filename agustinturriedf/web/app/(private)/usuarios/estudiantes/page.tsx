"use client";

import React, { FormEvent, useEffect, useState } from "react";

import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";
import styles from "@/app/(private)/usuarios/usuarios.module.css";

type StudentSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string | null;
  role: "STUDENT";
  status: "ACTIVE" | "INACTIVE" | "BLOCKED" | "ARCHIVED";
  version: number;
  createdAt: string;
  updatedAt: string;
  studentProfile: {
    id: string;
    trainerId: string | null;
    status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  } | null;
};

type DirectoryResponse =
  | { success: true; data: { items: StudentSummary[]; nextCursor: string | null } }
  | { success: false; error: { message: string; code: string } };

type Filters = {
  query: string;
  status: "" | StudentSummary["status"];
  trainerId: string;
};

const initialFilters: Filters = { query: "", status: "", trainerId: "" };

const statusLabel: Record<StudentSummary["status"], string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  BLOCKED: "Bloqueado",
  ARCHIVED: "Archivado",
};

const requestStudents = async (filters: Filters, cursor?: string) => {
  const params = new URLSearchParams({
    view: "students",
    limit: "25",
    sort: "createdAt:desc",
  });

  if (filters.query.trim()) params.set("search", filters.query.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.trainerId.trim()) params.set("trainerId", filters.trainerId.trim());
  if (cursor) params.set("cursor", cursor);

  const response = await fetch(`/api/users?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const payload = (await response.json()) as DirectoryResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "No se pudo cargar el directorio de alumnos." : payload.error.message);
  }

  return payload.data;
};

export default function StudentsPage() {
  const [draftFilters, setDraftFilters] = useState<Filters>(initialFilters);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [page, setPage] = useState(0);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const directory = await requestStudents(filters, cursor);

        if (!cancelled) {
          setStudents(directory.items);
          setNextCursor(directory.nextCursor);
        }
      } catch (requestError) {
        if (!cancelled) {
          setStudents([]);
          setNextCursor(null);
          setError(requestError instanceof Error ? requestError.message : "No se pudo cargar el directorio de alumnos.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [cursor, filters]);

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters(draftFilters);
    setCursorHistory([]);
    setCursor(undefined);
    setPage(0);
  };

  const goToNextPage = () => {
    if (!nextCursor) return;
    setCursorHistory((current) => [...current, cursor]);
    setCursor(nextCursor);
    setPage((current) => current + 1);
  };

  const goToPreviousPage = () => {
    const previousCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((current) => current.slice(0, -1));
    setCursor(previousCursor);
    setPage((current) => current - 1);
  };

  const hasFilters = Boolean(filters.query || filters.status || filters.trainerId);

  return (
    <section className={styles.page}>
      <PrivateBreadcrumb current="Alumnos" root={{ label: "Usuarios", href: "/usuarios" }} />
      <PrivateTopbar
        title="Alumnos"
        subtitle="Directorio operativo con acceso limitado a alumnos y filtros del servidor."
      />

      <div className={styles.content}>
        <section className={styles.tableSection} aria-labelledby="students-directory-title">
          <div className={styles.tableToolbar}>
            <div className={styles.tableTitleRow}>
              <h2 id="students-directory-title">Directorio de alumnos</h2>
              <span>25 resultados por página</span>
            </div>
          </div>

          <form className={styles.formGroupGrid3} onSubmit={applyFilters}>
            <label className={styles.fieldWrap}>
              <span>Buscar alumnos</span>
              <input
                aria-label="Buscar alumnos"
                value={draftFilters.query}
                onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))}
                placeholder="Nombre o email"
              />
            </label>
            <label className={styles.fieldWrap}>
              <span>Estado</span>
              <select
                aria-label="Estado"
                value={draftFilters.status}
                onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value as Filters["status"] }))}
              >
                <option value="">Todos los estados</option>
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
                <option value="BLOCKED">Bloqueado</option>
                <option value="ARCHIVED">Archivado</option>
              </select>
            </label>
            <label className={styles.fieldWrap}>
              <span>Entrenador</span>
              <input
                aria-label="Entrenador"
                value={draftFilters.trainerId}
                onChange={(event) => setDraftFilters((current) => ({ ...current, trainerId: event.target.value }))}
                placeholder="ID del entrenador"
              />
            </label>
            <button className={styles.createButton} type="submit">Aplicar filtros</button>
          </form>

          {error ? <p role="alert" className={styles.modalError}>{error}</p> : null}

          <div className={styles.tableWrap} aria-busy={loading}>
            <table>
              <thead>
                <tr><th>Alumno</th><th>Email</th><th>Estado</th><th>Entrenador</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={4} role="status" aria-live="polite">Cargando alumnos…</td></tr> : null}
                {!loading && !error && students.length === 0 ? (
                  <tr><td colSpan={4}>{page > 0 ? "No hay más alumnos para mostrar." : hasFilters ? "No hay alumnos para estos filtros." : "Todavía no hay alumnos registrados."}</td></tr>
                ) : null}
                {!loading && !error ? students.map((student) => (
                  <tr key={student.id}>
                    <td className={styles.userName}>{student.firstName} {student.lastName}</td>
                    <td className={styles.userEmail}>{student.email}</td>
                    <td><span className={student.status === "ACTIVE" ? styles.statusActive : styles.statusInactive}>{statusLabel[student.status]}</span></td>
                    <td>{student.studentProfile?.trainerId ?? "Sin entrenador asignado"}</td>
                  </tr>
                )) : null}
              </tbody>
            </table>
            <div className={styles.pagination}>
              <p>Página {page + 1}</p>
              <div>
                <button type="button" aria-label="Página anterior" disabled={page === 0 || loading} onClick={goToPreviousPage}>
                  <MaterialSymbol name="chevron_left" className={styles.paginationIcon} />
                </button>
                <button type="button" aria-label="Página siguiente" disabled={!nextCursor || loading} onClick={goToNextPage}>
                  <MaterialSymbol name="chevron_right" className={styles.paginationIcon} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
