"use client";

import React, { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";
import styles from "@/app/(private)/usuarios/usuarios.module.css";

type Invitation = {
  id: string;
  email: string;
  role: "ADMIN" | "TRAINER" | "STUDENT";
  status: "PENDING" | "SENT" | "CONSUMED" | "EXPIRED" | "REVOKED";
  deliveryStatus: "PENDING" | "SENT" | "FAILED" | null;
  expiresAt: string | null;
  createdAt: string;
  version: number;
};

type QueueResponse =
  | { success: true; data: { items: Invitation[]; nextCursor: string | null } }
  | { success: false; error: { message: string } };

type Filters = { search: string; status: "" | Invitation["status"]; role: "" | Invitation["role"] };

const initialFilters: Filters = { search: "", status: "", role: "" };
const genericError = "No se pudo completar la acción. Intentá nuevamente.";

const requestQueue = async (filters: Filters, cursor?: string) => {
  const params = new URLSearchParams({ limit: "25" });
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.role) params.set("role", filters.role);
  if (cursor) params.set("cursor", cursor);
  const response = await fetch(`/api/invitations?${params}`, { cache: "no-store" });
  const payload = await response.json() as QueueResponse;
  if (!response.ok || !payload.success) throw new Error(payload.success ? genericError : payload.error.message);
  return payload.data;
};

const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Sin vencimiento";

export default function InvitationsPage() {
  const [draftFilters, setDraftFilters] = useState<Filters>(initialFilters);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [items, setItems] = useState<Invitation[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<(string | undefined)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const load = async () => {
    try {
      setLoading(true); setError(null);
      const page = await requestQueue(filters, cursor);
      setItems(page.items); setNextCursor(page.nextCursor);
    } catch {
      setItems([]); setNextCursor(null); setError(genericError);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [cursor, filters]);
  useEffect(() => { if (revokeTarget) cancelRef.current?.focus(); }, [revokeTarget]);
  useEffect(() => () => triggerRef.current?.focus(), []);

  const closeDialog = () => { setRevokeTarget(null); triggerRef.current?.focus(); };
  const trapDialogFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") return closeDialog();
    if (event.key !== "Tab") return;
    const focusable = event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled])");
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const runAction = async (invitation: Invitation, action: "resend" | "revoke") => {
    try {
      setActionLoading(true); setError(null);
      const response = await fetch(`/api/invitations/${invitation.id}/${action}`, {
        method: action === "resend" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "resend" ? { expectedVersion: invitation.version } : { expectedVersion: invitation.version, reason: "Revocada desde la cola" }),
      });
      if (!response.ok) throw new Error();
      closeDialog(); await load();
    } catch { setError(genericError); } finally { setActionLoading(false); }
  };

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFilters(draftFilters); setHistory([]); setCursor(undefined);
  };
  const canChange = (invitation: Invitation) => ["PENDING", "SENT"].includes(invitation.status);

  return <section className={styles.page}>
    <PrivateBreadcrumb current="Invitaciones" root={{ label: "Usuarios", href: "/usuarios" }} />
    <PrivateTopbar title="Invitaciones" subtitle="Cola segura de invitaciones y su entrega." />
    <div className={styles.content}><section className={styles.tableSection} aria-labelledby="invitations-title">
      <div className={styles.tableTitleRow}><h2 id="invitations-title">Cola de invitaciones</h2><span>25 resultados por página</span></div>
      <form className={styles.formGroupGrid3} onSubmit={applyFilters}>
        <label className={styles.fieldWrap}><span>Buscar</span><input aria-label="Buscar invitaciones" value={draftFilters.search} onChange={(event) => setDraftFilters((value) => ({ ...value, search: event.target.value }))} /></label>
        <label className={styles.fieldWrap}><span>Estado</span><select aria-label="Estado" value={draftFilters.status} onChange={(event) => setDraftFilters((value) => ({ ...value, status: event.target.value as Filters["status"] }))}><option value="">Todos</option><option value="PENDING">Pendiente</option><option value="SENT">Enviada</option><option value="CONSUMED">Consumida</option><option value="EXPIRED">Vencida</option><option value="REVOKED">Revocada</option></select></label>
        <label className={styles.fieldWrap}><span>Rol</span><select aria-label="Rol" value={draftFilters.role} onChange={(event) => setDraftFilters((value) => ({ ...value, role: event.target.value as Filters["role"] }))}><option value="">Todos</option><option value="STUDENT">Alumno</option><option value="TRAINER">Entrenador</option><option value="ADMIN">Administrador</option></select></label>
        <button className={styles.createButton} type="submit">Aplicar filtros</button>
      </form>
      {error ? <p className={styles.modalError} role="alert">{error}</p> : null}
      <div className={styles.tableWrap} aria-busy={loading}><table><thead><tr><th>Email</th><th>Rol</th><th>Estado</th><th>Entrega</th><th>Vence</th><th>Acciones</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={6} role="status" aria-live="polite">Cargando invitaciones…</td></tr> : null}
        {!loading && !error && items.length === 0 ? <tr><td colSpan={6}>{cursor ? "No hay más invitaciones para mostrar." : filters.search || filters.status || filters.role ? "No hay invitaciones para estos filtros." : "Todavía no hay invitaciones."}</td></tr> : null}
        {!loading && !error ? items.map((invitation) => <tr key={invitation.id}><td className={styles.userEmail}>{invitation.email}</td><td>{invitation.role}</td><td>{invitation.status}</td><td>{invitation.deliveryStatus ?? "Sin estado"}</td><td>{dateLabel(invitation.expiresAt)}</td><td className={styles.invitationActions}>{canChange(invitation) ? <><button type="button" onClick={() => void runAction(invitation, "resend")}>Reenviar</button><button type="button" onClick={(event) => { triggerRef.current = event.currentTarget; setRevokeTarget(invitation); }}>Revocar</button></> : "Sin acciones"}</td></tr>) : null}
      </tbody></table><div className={styles.pagination}><p>Cola de invitaciones</p><div><button type="button" aria-label="Página anterior" disabled={!history.length || loading} onClick={() => { const previous = history.at(-1); setHistory((value) => value.slice(0, -1)); setCursor(previous); }}>‹</button><button type="button" aria-label="Página siguiente" disabled={!nextCursor || loading} onClick={() => { if (!nextCursor) return; setHistory((value) => [...value, cursor]); setCursor(nextCursor); }}>›</button></div></div></div>
    </section></div>
    {revokeTarget ? <div className={styles.invitationDialogOverlay}><div className={styles.invitationDialog} role="dialog" aria-modal="true" aria-labelledby="revoke-title" onKeyDown={trapDialogFocus}><h2 id="revoke-title">¿Revocar invitación?</h2><p>La invitación para {revokeTarget.email} dejará de ser válida.</p><div className={styles.invitationDialogActions}><button ref={cancelRef} type="button" onClick={closeDialog} disabled={actionLoading}>Cancelar</button><button type="button" onClick={() => void runAction(revokeTarget, "revoke")} disabled={actionLoading}>Confirmar revocación</button></div></div></div> : null}
  </section>;
}
