import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { invitationQueueQuerySchema } from "@/lib/validation/invitations";

vi.mock("@/components/private-breadcrumb", () => ({ PrivateBreadcrumb: () => <nav aria-label="Breadcrumb" /> }));
vi.mock("@/components/private-topbar", () => ({ PrivateTopbar: ({ title }: { title: string }) => <h1>{title}</h1> }));

import InvitationsPage from "./page";

const invitation = {
  id: "c123456789012345678901234",
  email: "ana@example.com",
  role: "STUDENT" as const,
  status: "PENDING" as const,
  deliveryStatus: "SENT" as const,
  expiresAt: "2026-10-01T12:00:00.000Z",
  createdAt: "2026-09-20T12:00:00.000Z",
  version: 3,
};

const response = (items = [invitation], nextCursor: string | null = "opaque-next") =>
  new Response(JSON.stringify({ success: true, data: { items, nextCursor } }), { status: 200 });

describe("InvitationsPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders safe queue DTOs, delivery/expiry, and schema-valid filters with cursor pagination", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response()).mockResolvedValueOnce(response()).mockResolvedValueOnce(response([], null));
    vi.stubGlobal("fetch", fetchMock);
    render(<InvitationsPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando invitaciones…");
    expect(await screen.findByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("SENT")).toBeInTheDocument();
    expect(screen.getByText(/1 oct 2026/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Consumida" })).toHaveValue("CONSUMED");
    expect(screen.getByRole("option", { name: "Vencida" })).toHaveValue("EXPIRED");

    fireEvent.change(screen.getByLabelText("Buscar invitaciones"), { target: { value: " Ana " } });
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "CONSUMED" } });
    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "STUDENT" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/invitations?limit=25&search=Ana&status=CONSUMED&role=STUDENT", expect.objectContaining({ cache: "no-store" }),
    ));
    const url = new URL(fetchMock.mock.calls.at(-1)?.[0] as string, "http://localhost");
    expect(invitationQueueQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries())).success).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/invitations?limit=25&search=Ana&status=CONSUMED&role=STUDENT&cursor=opaque-next", expect.anything(),
    ));
    expect(await screen.findByText("No hay más invitaciones para mostrar.")).toBeInTheDocument();
  });

  it("confirms revoke accessibly, traps focus, restores focus, and sends expectedVersion actions", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response()).mockResolvedValueOnce(new Response("{}", { status: 200 })).mockResolvedValueOnce(response());
    vi.stubGlobal("fetch", fetchMock);
    render(<InvitationsPage />);
    const revoke = await screen.findByRole("button", { name: "Revocar" });
    fireEvent.click(revoke);

    const dialog = screen.getByRole("dialog", { name: "¿Revocar invitación?" });
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    const confirm = screen.getByRole("button", { name: "Confirmar revocación" });
    confirm.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(confirm).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(revoke).toHaveFocus();

    fireEvent.click(revoke);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar revocación" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      `/api/invitations/${invitation.id}/revoke`, expect.objectContaining({ method: "DELETE", body: JSON.stringify({ expectedVersion: 3, reason: "Revocada desde la cola" }) }),
    ));
  });

  it("sends the current expectedVersion when resending", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response()).mockResolvedValueOnce(new Response("{}", { status: 200 })).mockResolvedValueOnce(response());
    vi.stubGlobal("fetch", fetchMock);
    render(<InvitationsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Reenviar" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      `/api/invitations/${invitation.id}/resend`, expect.objectContaining({ method: "POST", body: JSON.stringify({ expectedVersion: 3 }) }),
    ));
  });

  it("keeps failures generic", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: { message: "internal details" } }), { status: 403 })));
    render(<InvitationsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo completar la acción. Intentá nuevamente.");
  });
});
