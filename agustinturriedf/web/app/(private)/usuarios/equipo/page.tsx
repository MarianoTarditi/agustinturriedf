"use client";

import React, { FormEvent, useEffect, useState } from "react";

import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateTopbar } from "@/components/private-topbar";
import styles from "@/app/(private)/usuarios/usuarios.module.css";

type TeamMemberSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "TRAINER";
  status: "ACTIVE" | "INACTIVE" | "BLOCKED" | "ARCHIVED";
};

type DirectoryResponse =
  | { success: true; data: { items: TeamMemberSummary[]; nextCursor: string | null } }
  | { success: false; error: { message: string; code: string } };

type Filters = {
  query: string;
  status: "" | TeamMemberSummary["status"];
  role: "" | TeamMemberSummary["role"];
};

const initialFilters: Filters = { query: "", status: "", role: "" };

const statusLabel: Record<TeamMemberSummary["status"], string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  BLOCKED: "Bloqueado",
  ARCHIVED: "Archivado",
};

const roleLabel: Record<TeamMemberSummary["role"], string> = {
  ADMIN: "Administrador",
  TRAINER: "Entrenador",
};

const requestTeam = async (filters: Filters, cursor?: string) => {
  const params = new URLSearchParams({
    view: "team",
    limit: "25",
    sort: "createdAt:desc",
  });

  if (filters.query.trim()) params.set("search", filters.query.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.role) params.set("role", filters.role);
  if (cursor) params.set("cursor", cursor);

  const response = await fetch(`/api/users?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const payload = (await response.json()) as DirectoryResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "No se pudo cargar el directorio del equipo." : payload.error.message);
  }

  return payload.data;
};

export default function TeamPage() {
  const [draftFilters, setDraftFilters] = useState<Filters>(initialFilters);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [page, setPage] = useState(0);
  const [teamMembers, setTeamMembers] = useState<TeamMemberSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const directory = await requestTeam(filters, cursor);

        if (!cancelled) {
          setTeamMembers(directory.items);
          setNextCursor(directory.nextCursor);
        }
      } catch (requestError) {
        if (!cancelled) {
          setTeamMembers([]);
          setNextCursor(null);
          setError(requestError instanceof Error ? requestError.message : "No se pudo cargar el directorio del equipo.");
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

  const hasFilters = Boolean(filters.query || filters.status || filters.role);

  return (
    <section className={styles.page}>
      <PrivateBreadcrumb current="Equipo" root={{ label: "Usuarios", href: "/usuarios" }} />
      <PrivateTopbar title="Equipo" subtitle="Directorio operativo de administradores y entrenadores." />

      <div className={styles.content}>
        <section className={styles.tableSection} aria-labelledby="team-directory-title">
          <div className={styles.tableToolbar}>
            <div className={styles.tableTitleRow}>
              <h2 id="team-directory-title">Directorio del equipo</h2>
              <span>25 resultados por página</span>
            </div>
          </div>

          <form className={styles.formGroupGrid3} onSubmit={applyFilters}>
            <label className={styles.fieldWrap}>
              <span>Buscar equipo</span>
              <input
                aria-label="Buscar equipo"
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
              <span>Rol</span>
              <select
                aria-label="Rol"
                value={draftFilters.role}
                onChange={(event) => setDraftFilters((current) => ({ ...current, role: event.target.value as Filters["role"] }))}
              >
                <option value="">Todos los roles</option>
                <option value="ADMIN">Administrador</option>
                <option value="TRAINER">Entrenador</option>
              </select>
            </label>
            <button className={styles.createButton} type="submit">Aplicar filtros</button>
          </form>

          {error ? <p role="alert" className={styles.modalError}>{error}</p> : null}

          <div className={styles.tableWrap} aria-busy={loading}>
            <table>
              <thead>
                <tr><th>Miembro</th><th>Email</th><th>Rol</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={4} role="status" aria-live="polite">Cargando equipo…</td></tr> : null}
                {!loading && !error && teamMembers.length === 0 ? (
                  <tr><td colSpan={4}>{page > 0 ? "No hay más miembros para mostrar." : hasFilters ? "No hay miembros para estos filtros." : "Todavía no hay miembros registrados."}</td></tr>
                ) : null}
                {!loading && !error ? teamMembers.map((member) => (
                  <tr key={member.id}>
                    <td className={styles.userName}>{member.firstName} {member.lastName}</td>
                    <td className={styles.userEmail}>{member.email}</td>
                    <td>{roleLabel[member.role]}</td>
                    <td><span className={member.status === "ACTIVE" ? styles.statusActive : styles.statusInactive}>{statusLabel[member.status]}</span></td>
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
