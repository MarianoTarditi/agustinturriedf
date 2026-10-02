import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/toast-provider";
import UsuariosPage from "./page";

vi.mock("@/components/private-topbar", () => ({ PrivateTopbar: () => null }));
vi.mock("@/components/private-breadcrumb", () => ({ PrivateBreadcrumb: () => null }));

const student = {
  id: "student-1", firstName: "Ana", lastName: "Gomez", email: "ana@example.com",
  role: "STUDENT", status: "ACTIVE", version: 7, photoUrl: null, phone: null,
  birthDate: null, gender: null, heightCm: null, weightKg: null,
  createdAt: "2026-01-01", updatedAt: "2026-01-01", studentProfile: { trainerId: "trainer-1", status: "ACTIVE" },
};
const trainer = {
  ...student,
  id: "trainer-1",
  firstName: "Tomas",
  lastName: "Trainer",
  email: "trainer@example.com",
  role: "TRAINER",
  studentProfile: null,
};
let archive = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();
let createInvitation = vi.fn<() => Promise<Response>>();

beforeEach(() => {
  archive = vi.fn();
  createInvitation = vi.fn();
  vi.stubGlobal("React", React);
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") return archive(url, init);
    if (init?.method === "POST") return createInvitation();
    return Response.json({
      success: true,
      data: url === "/api/users"
        ? [student, trainer]
        : url === "/api/invitations"
          ? []
          : { defaultMonthlyAmountInCents: 1000 },
    });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const openArchive = async () => {
  render(<ToastProvider><UsuariosPage /></ToastProvider>);
  fireEvent.click(await screen.findByRole("button", { name: "Archivar alumno Ana Gomez" }));
  return within(screen.getByRole("dialog", { name: "Archivar alumno Ana Gomez" }));
};

const openCreate = async () => {
  render(<ToastProvider><UsuariosPage /></ToastProvider>);
  fireEvent.click(await screen.findByRole("button", { name: "Crear alumno" }));
  const dialog = within(screen.getByRole("dialog", { name: "Crear alumno" }));
  fireEvent.change(dialog.getByLabelText("Nombre *"), { target: { value: "Luz" } });
  fireEvent.change(dialog.getByLabelText("Apellido *"), { target: { value: "Diaz" } });
  fireEvent.change(dialog.getByLabelText("Email *"), { target: { value: "luz@example.com" } });
  fireEvent.change(dialog.getByLabelText("Celular *"), { target: { value: "+54 11 5555 1234" } });
  return dialog;
};

it("shows one success toast and closes after creating an invitation", async () => {
  createInvitation.mockResolvedValue(Response.json({ success: true, data: { id: "invitation-1" } }));
  const dialog = await openCreate();

  fireEvent.click(dialog.getByRole("button", { name: "Crear alumno" }));

  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Crear alumno" })).not.toBeInTheDocument());
  expect(screen.getAllByText("Invitación creada. El email de activación quedó en cola.")).toHaveLength(1);
  expect(screen.getByRole("status")).toHaveTextContent("Invitación creada. El email de activación quedó en cola.");
  expect(createInvitation).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Luz Diaz")).not.toBeInTheDocument();
});

it("keeps the invitation form open and emits no success toast on failure", async () => {
  createInvitation.mockResolvedValue(Response.json({ success: false, error: { message: "Invitation rejected" } }, { status: 409 }));
  const dialog = await openCreate();

  fireEvent.click(dialog.getByRole("button", { name: "Crear alumno" }));

  await dialog.findByText("Invitation rejected");
  expect(screen.getByRole("dialog", { name: "Crear alumno" })).toBeInTheDocument();
  expect(dialog.getByLabelText("Email *")).toHaveValue("luz@example.com");
  expect(screen.queryByText("Invitación creada. El email de activación quedó en cola.")).not.toBeInTheDocument();
});

it("confirms without a reason input, prevents duplicate submission and reconciles on success", async () => {
  let resolve!: (response: Response) => void;
  archive.mockImplementation(() => new Promise<Response>((done) => { resolve = done; }));
  const dialog = await openArchive();
  expect(dialog.queryByRole("textbox")).not.toBeInTheDocument();
  expect(dialog.queryByLabelText(/motivo/i)).not.toBeInTheDocument();
  expect(dialog.getByText(student.email)).toBeInTheDocument();
  fireEvent.click(dialog.getByRole("button", { name: "Archivar alumno" }));
  expect(dialog.getByRole("button", { name: "Archivando..." })).toBeDisabled();
  expect(dialog.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  expect(dialog.getByRole("button", { name: "Cerrar modal" })).toBeDisabled();
  expect(screen.getByRole("dialog")).toHaveAttribute("aria-busy", "true");
  fireEvent.click(screen.getByRole("dialog").parentElement!);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.click(dialog.getByRole("button", { name: "Archivando..." }));
  expect(archive).toHaveBeenCalledTimes(1);
  expect(JSON.parse(String(archive.mock.calls[0][1].body))).toEqual({ targetStatus: "ARCHIVED", expectedVersion: 7, reason: "Archivado desde la gestión de usuarios." });
  resolve(Response.json({ success: true, data: { ...student, status: "ARCHIVED", version: 8 } }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.queryByRole("button", { name: "Archivar alumno Ana Gomez" })).not.toBeInTheDocument();
});

it.each([403, 409, 500])("preserves the row and selected identity on error %s", async (status) => {
  archive.mockResolvedValue(Response.json({ success: false, error: { message: "Archive rejected" } }, { status }));
  const dialog = await openArchive();
  fireEvent.click(dialog.getByRole("button", { name: "Archivar alumno" }));
  await dialog.findByText("Archive rejected");
  expect(dialog.getByText(student.email)).toBeInTheDocument();
  expect(dialog.getByText("Ana Gomez")).toBeInTheDocument();
  expect(screen.getByRole("dialog")).toHaveAttribute("aria-busy", "false");
  expect(dialog.getByRole("button", { name: "Archivar alumno" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Archivar alumno Ana Gomez" })).toBeInTheDocument();
});

it.each(["network", "malformed", "unconfirmed"])("keeps the row and modal after a %s response", async (failure) => {
  if (failure === "network") archive.mockRejectedValue(new Error("Network unavailable"));
  else if (failure === "malformed") archive.mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 502 }));
  else archive.mockResolvedValue(Response.json({ success: true, data: { ...student, status: "ACTIVE", version: 8 } }));
  const dialog = await openArchive();
  fireEvent.click(dialog.getByRole("button", { name: "Archivar alumno" }));
  await dialog.findByText(failure === "network" ? "Network unavailable" : /No se pudo confirmar/);
  expect(dialog.getByText(student.email)).toBeInTheDocument();
  expect(dialog.getByRole("button", { name: "Archivar alumno" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Archivar alumno Ana Gomez" })).toBeInTheDocument();
});
