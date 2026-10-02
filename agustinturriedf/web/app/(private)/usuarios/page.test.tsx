import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/toast-provider";
import UsuariosPage from "./page";

vi.mock("@/components/private-topbar", () => ({ PrivateTopbar: () => null }));
vi.mock("@/components/private-breadcrumb", () => ({ PrivateBreadcrumb: () => null }));

const makeUser = (
  id: string,
  firstName: string,
  lastName: string,
  email: string,
  role: "ADMIN" | "TRAINER" | "STUDENT",
  status: "ACTIVE" | "INACTIVE",
) => ({
  id,
  firstName,
  lastName,
  email,
  role,
  status,
  version: 1,
  photoUrl: null,
  phone: null,
  birthDate: null,
  gender: null,
  heightCm: null,
  weightKg: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  studentProfile: role === "STUDENT" ? { trainerId: "trainer-1", status: "ACTIVE" } : null,
});

const users = [
  makeUser("user-1", "Álvaro", "10", "zeta@example.com", "STUDENT", "ACTIVE"),
  makeUser("user-2", "Ana", "Igual", "tie-b@example.com", "ADMIN", "INACTIVE"),
  makeUser("user-3", "alvaro", "2", "beta@example.com", "TRAINER", "ACTIVE"),
  makeUser("user-4", "Zulu", "Final", "omega@example.com", "STUDENT", "INACTIVE"),
  makeUser("user-5", "Ana", "Igual", "tie-a@example.com", "TRAINER", "ACTIVE"),
  makeUser("user-6", "Beto", "Medio", "alpha@example.com", "ADMIN", "ACTIVE"),
];

const displayedValue = (user: (typeof users)[number], key: "name" | "email" | "role" | "status") => {
  if (key === "name") return `${user.firstName} ${user.lastName}`;
  if (key === "role") return user.role.toLowerCase();
  if (key === "status") return user.status === "ACTIVE" ? "Activo" : "Inactivo";
  return user.email;
};

const expectedEmails = (key: "name" | "email" | "role" | "status", direction: "ascending" | "descending") => {
  const collator = new Intl.Collator("es-AR", { sensitivity: "base", numeric: true });
  const multiplier = direction === "ascending" ? 1 : -1;

  return users
    .map((user, index) => ({ user, index }))
    .sort((left, right) => {
      const comparison = collator.compare(
        displayedValue(left.user, key),
        displayedValue(right.user, key),
      );
      return comparison === 0 ? left.index - right.index : comparison * multiplier;
    })
    .slice(0, 4)
    .map(({ user }) => user.email);
};

const visibleEmails = () => within(screen.getByRole("table"))
  .getAllByRole("row")
  .slice(1)
  .map((row) => within(row).getAllByRole("cell")[2].textContent);

const renderPage = async () => {
  render(<ToastProvider><UsuariosPage /></ToastProvider>);
  await screen.findByText("6 usuarios totales");
};

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json({
    success: true,
    data: url === "/api/users"
      ? users
      : url === "/api/invitations"
        ? []
        : { defaultMonthlyAmountInCents: 1000 },
  })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("sorts every supported column ascending first and descending on repeat", async () => {
  await renderPage();

  const cases = [
    ["Usuario", "name"],
    ["Email", "email"],
    ["Roles", "role"],
    ["Estado", "status"],
  ] as const;

  for (const [label, key] of cases) {
    const ascendingButton = screen.getByRole("button", {
      name: `Ordenar ${label} ascendente`,
    });
    fireEvent.click(ascendingButton);

    const header = ascendingButton.closest("th");
    expect(header).toHaveAttribute("aria-sort", "ascending");
    expect(within(header!).getByText("arrow_upward")).toBeInTheDocument();
    expect(visibleEmails()).toEqual(expectedEmails(key, "ascending"));

    fireEvent.click(screen.getByRole("button", {
      name: `Ordenar ${label} descendente`,
    }));

    expect(header).toHaveAttribute("aria-sort", "descending");
    expect(within(header!).getByText("arrow_downward")).toBeInTheDocument();
    expect(visibleEmails()).toEqual(expectedEmails(key, "descending"));
  }
});

it("sorts the full locale-aware list, preserves ties, and resets pagination", async () => {
  await renderPage();
  fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
  expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Ordenar Usuario ascendente" }));

  expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  expect(visibleEmails()).toEqual([
    "beta@example.com",
    "zeta@example.com",
    "tie-b@example.com",
    "tie-a@example.com",
  ]);
});

it("exposes sortable semantics only on interactive headers", async () => {
  await renderPage();

  for (const label of ["Usuario", "Email", "Roles", "Estado"]) {
    const button = screen.getByRole("button", { name: `Ordenar ${label} ascendente` });
    expect(button.closest("th")).toHaveAttribute("aria-sort", "none");
  }

  for (const label of ["Foto", "Acciones"]) {
    const header = screen.getByRole("columnheader", { name: label });
    expect(header).not.toHaveAttribute("aria-sort");
    expect(within(header).queryByRole("button")).not.toBeInTheDocument();
  }

  expect(screen.queryByRole("button", { name: "Ordenar vista" })).not.toBeInTheDocument();
});

it("searches by name and email without matching role or status", async () => {
  await renderPage();
  const search = screen.getByRole("searchbox", { name: "Buscar usuarios por nombre o email" });

  fireEvent.change(search, { target: { value: "ALVARO" } });
  expect(visibleEmails()).toEqual(["zeta@example.com", "beta@example.com"]);

  fireEvent.change(search, { target: { value: "OMEGA@EXAMPLE" } });
  expect(visibleEmails()).toEqual(["omega@example.com"]);

  fireEvent.change(search, { target: { value: "trainer" } });
  expect(screen.getByText("No se encontraron usuarios.")).toBeInTheDocument();

  fireEvent.change(search, { target: { value: "inactivo" } });
  expect(screen.getByText("No se encontraron usuarios.")).toBeInTheDocument();
});

it("resets pagination when searching and restores the list when cleared", async () => {
  await renderPage();
  fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
  expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();

  const search = screen.getByRole("searchbox", { name: "Buscar usuarios por nombre o email" });
  fireEvent.change(search, { target: { value: "Beto" } });

  expect(screen.getByText("Página 1 de 1")).toBeInTheDocument();
  expect(visibleEmails()).toEqual(["alpha@example.com"]);

  fireEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
  expect(search).toHaveValue("");
  expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  expect(visibleEmails()).toEqual(users.slice(0, 4).map((user) => user.email));
});

it("keeps the user list available when payment configuration fails", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url === "/api/users") {
      return Response.json({ success: true, data: users });
    }

    return Response.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 },
    );
  }));

  await renderPage();

  expect(visibleEmails()).toEqual(users.slice(0, 4).map((user) => user.email));
  expect(screen.queryByText("Internal server error")).not.toBeInTheDocument();
});

it("shows a readable user profile with explicit empty values", async () => {
  await renderPage();
  fireEvent.click(screen.getByRole("button", { name: "Ver detalle de Álvaro 10" }));

  const dialog = screen.getByRole("dialog", { name: "Perfil de Usuario" });
  expect(within(dialog).getByRole("heading", { name: "Álvaro 10" })).toBeInTheDocument();
  expect(within(dialog).getAllByText("Student")).toHaveLength(2);
  expect(within(dialog).getByText("zeta@example.com")).toBeInTheDocument();
  expect(within(dialog).getAllByText("Sin registrar")).toHaveLength(5);
  expect(within(dialog).queryByText("cm")).not.toBeInTheDocument();
  expect(within(dialog).queryByText("kg")).not.toBeInTheDocument();
});

it("shows invitation states in Estado and runs only their matching actions", async () => {
  const invitations = [
    {
      id: "inv-sent", email: "sent@example.com", firstName: "Sara", lastName: "Enviada",
      role: "STUDENT", trainerId: "user-3", status: "PENDING", deliveryStatus: "SENT",
      expiresAt: "2099-10-03T00:00:00.000Z", createdAt: "2026-10-01T00:00:00.000Z", version: 2,
    },
    {
      id: "inv-expired", email: "expired@example.com", firstName: "Eva", lastName: "Vencida",
      role: "STUDENT", trainerId: "user-3", status: "PENDING", deliveryStatus: "SENT",
      expiresAt: "2020-10-01T00:00:00.000Z", createdAt: "2026-10-01T00:00:00.000Z", version: 3,
    },
    {
      id: "inv-hidden", email: "pending@example.com", firstName: "Pia", lastName: "Pendiente",
      role: "STUDENT", trainerId: "user-3", status: "PENDING", deliveryStatus: "PENDING",
      expiresAt: "2099-10-03T00:00:00.000Z", createdAt: "2026-10-01T00:00:00.000Z", version: 1,
    },
  ];
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/users") return Response.json({ success: true, data: [users[2]] });
    if (url === "/api/invitations") return Response.json({ success: true, data: invitations });
    if (url === "/api/payments/config") return Response.json({ success: true, data: { defaultMonthlyAmountInCents: 1000 } });
    if (init?.method === "POST" || init?.method === "DELETE") return Response.json({ success: true, data: { id: "invitation" } });
    return Response.json({ success: false, error: { message: "Unexpected request" } }, { status: 500 });
  });
  vi.stubGlobal("fetch", fetchMock);

  render(<ToastProvider><UsuariosPage /></ToastProvider>);
  await screen.findByText("3 usuarios totales");

  const sentRow = screen.getByText("sent@example.com").closest("tr")!;
  const expiredRow = screen.getByText("expired@example.com").closest("tr")!;
  expect(within(sentRow).getByText("Enviada")).toBeInTheDocument();
  expect(within(sentRow).getByRole("button", { name: "Revocar" })).toBeInTheDocument();
  expect(within(expiredRow).getByText("Vencida")).toBeInTheDocument();
  expect(within(expiredRow).getByRole("button", { name: "Enviar" })).toBeInTheDocument();
  expect(screen.queryByText("pending@example.com")).not.toBeInTheDocument();
  expect(within(sentRow).queryByRole("button", { name: /Ver detalle/ })).not.toBeInTheDocument();

  fireEvent.click(within(expiredRow).getByRole("button", { name: "Enviar" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
    "/api/invitations/inv-expired/resend",
    expect.objectContaining({ method: "POST", body: JSON.stringify({ expectedVersion: 3 }) }),
  ));
  expect(screen.queryByText("expired@example.com")).not.toBeInTheDocument();

  fireEvent.click(within(sentRow).getByRole("button", { name: "Revocar" }));
  const dialog = screen.getByRole("dialog", { name: "Revocar invitación de Sara Enviada" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Revocar invitación" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
    "/api/invitations/inv-sent/revoke",
    expect.objectContaining({ method: "DELETE" }),
  ));
  expect(screen.queryByText("sent@example.com")).not.toBeInTheDocument();
});
