import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { userDirectoryQuerySchema } from "@/lib/validation/users";

vi.mock("@/components/material-symbol", () => ({
  MaterialSymbol: () => <span />,
}));
vi.mock("@/components/private-breadcrumb", () => ({
  PrivateBreadcrumb: () => <nav aria-label="Breadcrumb" />,
}));
vi.mock("@/components/private-topbar", () => ({
  PrivateTopbar: ({ title }: { title?: string }) => <h1>{title}</h1>,
}));

import TeamPage from "./page";

const teamMember = {
  id: "trainer-1",
  firstName: "Lucía",
  lastName: "Pérez",
  email: "lucia@example.com",
  photoUrl: null,
  role: "TRAINER",
  status: "ACTIVE",
  version: 4,
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
  studentProfile: null,
};

const respondWithDirectory = (items = [teamMember], nextCursor: string | null = "next-page") =>
  new Response(JSON.stringify({ success: true, data: { items, nextCursor } }), { status: 200 });

describe("TeamPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders safe team summaries and advances with the opaque cursor", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(respondWithDirectory()).mockResolvedValueOnce(respondWithDirectory([], null));
    vi.stubGlobal("fetch", fetchMock);

    render(<TeamPage />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("status")).toHaveTextContent("Cargando equipo…");
    expect(await screen.findByText("Lucía Pérez")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Entrenador" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/users?view=team&limit=25&sort=createdAt%3Adesc&cursor=next-page",
        expect.objectContaining({ cache: "no-store" }),
      );
    });
    expect(await screen.findByText("No hay más miembros para mostrar.")).toBeInTheDocument();
  });

  it("applies search, status, and role filters with a schema-valid team request", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(respondWithDirectory([], null)));
    vi.stubGlobal("fetch", fetchMock);

    render(<TeamPage />);
    await screen.findByText("Todavía no hay miembros registrados.");

    fireEvent.change(screen.getByLabelText("Buscar equipo"), { target: { value: " Lucía " } });
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "INACTIVE" } });
    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "TRAINER" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/users?view=team&limit=25&sort=createdAt%3Adesc&search=Luc%C3%ADa&status=INACTIVE&role=TRAINER",
        expect.objectContaining({ cache: "no-store" }),
      );
    });

    const requestUrl = new URL(fetchMock.mock.calls.at(-1)?.[0] as string, "http://localhost");
    expect(userDirectoryQuerySchema.safeParse(Object.fromEntries(requestUrl.searchParams.entries())).success).toBe(true);
  });

  it("keeps authorization and request failures visible to the operator", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: { code: "FORBIDDEN", message: "No tenés permisos para ver el equipo." } }), { status: 403 }),
      ),
    );

    render(<TeamPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No tenés permisos para ver el equipo.");
  });
});
