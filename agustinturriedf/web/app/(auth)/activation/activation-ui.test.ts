import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock, pushMock } = vi.hoisted(() => ({ cookiesMock: vi.fn(), pushMock: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/app/(auth)/_components/auth-card", () => ({ AuthCard: ({ children }: { children: unknown }) => children }));

import ActivationPage from "@/app/(auth)/activation/page";
import { ActivationForm } from "@/app/(auth)/activation/_components/activation-form";

describe("activation UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookiesMock.mockResolvedValue({ get: () => ({ value: "opaque-session" }) });
  });

  afterEach(cleanup);

  it("renders permanent, described password guidance without a dismiss path", () => {
    render(React.createElement(ActivationForm));

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Mínimo 8 caracteres")).toBeVisible();
    expect(screen.getByText("Una letra mayúscula")).toBeVisible();
    expect(screen.getByText("Una letra minúscula")).toBeVisible();
    expect(screen.getByText("Un número")).toBeVisible();
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("aria-describedby", "password-requirements");
    expect(screen.getByLabelText("Repetir contraseña")).toHaveAttribute("aria-describedby", "password-requirements");
    expect(screen.queryByRole("button", { name: /cerrar|cancelar|omitir/i })).not.toBeInTheDocument();
  });

  it("shows accessible policy and mismatch feedback before posting", () => {
    render(React.createElement(ActivationForm));

    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "weak" } });
    fireEvent.change(screen.getByLabelText("Repetir contraseña"), { target: { value: "different" } });
    fireEvent.click(screen.getByRole("button", { name: "Activar cuenta" }));

    expect(screen.getByRole("alert")).toHaveTextContent("La contraseña debe cumplir todos los requisitos indicados.");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("aria-describedby", "password-requirements password-feedback");
  });

  it("posts only password setup and reports mismatch feedback", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { message: "ok" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(React.createElement(ActivationForm));

    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Segura123" } });
    fireEvent.change(screen.getByLabelText("Repetir contraseña"), { target: { value: "Segura124" } });
    fireEvent.click(screen.getByRole("button", { name: "Activar cuenta" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Las contraseñas no coinciden.");
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Repetir contraseña"), { target: { value: "Segura123" } });
    fireEvent.click(screen.getByRole("button", { name: "Activar cuenta" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ password: "Segura123", confirmPassword: "Segura123" });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("opaque-session");
    expect(pushMock).toHaveBeenCalledWith("/activation/confirm");
  });

  it("renders recovery instead of the form when its marker overrides a stale cookie", async () => {
    render(await ActivationPage({ searchParams: Promise.resolve({ recovery: "1" }) }));

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo continuar con la activación.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("opaque-session");
  });
});
