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

import StudentsPage from "./page";

const student = {
  id: "student-1",
  firstName: "Ana",
  lastName: "Gómez",
  email: "ana@example.com",
  photoUrl: null,
  role: "STUDENT",
  status: "ACTIVE",
  version: 3,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  studentProfile: { id: "profile-1", trainerId: null, status: "ACTIVE" },
};

const respondWithDirectory = (items = [student], nextCursor: string | null = "next-page") =>
  new Response(JSON.stringify({ success: true, data: { items, nextCursor } }), { status: 200 });

describe("StudentsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders safe student summaries and advances with the opaque cursor", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(respondWithDirectory()).mockResolvedValueOnce(respondWithDirectory([], null));
    vi.stubGlobal("fetch", fetchMock);

    render(<StudentsPage />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("status")).toHaveTextContent("Cargando alumnos…");
    expect(await screen.findByText("Ana Gómez")).toBeInTheDocument();
    expect(screen.getByText("Sin entrenador asignado")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/users?view=students&limit=25&sort=createdAt%3Adesc&cursor=next-page",
        expect.objectContaining({ cache: "no-store" }),
      );
    });
    expect(await screen.findByText("No hay más alumnos para mostrar.")).toBeInTheDocument();
  });

  it("applies search, status, and trainer filters without exposing a team request", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(respondWithDirectory([], null)));
    vi.stubGlobal("fetch", fetchMock);

    render(<StudentsPage />);
    await screen.findByText("Todavía no hay alumnos registrados.");

    fireEvent.change(screen.getByLabelText("Buscar alumnos"), { target: { value: " Ana " } });
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "INACTIVE" } });
    fireEvent.change(screen.getByLabelText("Entrenador"), { target: { value: "c123456789012345678901234" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/users?view=students&limit=25&sort=createdAt%3Adesc&search=Ana&status=INACTIVE&trainerId=c123456789012345678901234",
        expect.objectContaining({ cache: "no-store" }),
      );
    });

    const requestUrl = new URL(fetchMock.mock.calls.at(-1)?.[0] as string, "http://localhost");
    const parsedQuery = userDirectoryQuerySchema.safeParse(Object.fromEntries(requestUrl.searchParams.entries()));

    expect(parsedQuery.success).toBe(true);
  });

  it("keeps authorization and request failures visible to the operator", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: { code: "FORBIDDEN", message: "No tenés permisos para ver alumnos." } }), { status: 403 }),
      ),
    );

    render(<StudentsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No tenés permisos para ver alumnos.");
  });
});
