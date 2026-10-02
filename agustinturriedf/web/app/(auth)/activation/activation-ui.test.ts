import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock, pushMock, redirectMock } = vi.hoisted(() => ({ cookiesMock: vi.fn(), pushMock: vi.fn(), redirectMock: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }), redirect: redirectMock }));
vi.mock("@/app/(auth)/_components/auth-card", () => ({ AuthCard: ({ children, maxWidth }: { children: React.ReactNode; maxWidth?: number }) => React.createElement("div", { "data-testid": "auth-card", style: { maxWidth } }, children) }));

import ActivationPage from "@/app/(auth)/activation/page";
import { ActivationForm } from "@/app/(auth)/activation/_components/activation-form";
import ActivationConfirmPage from "@/app/(auth)/activation/confirm/page";

describe("activation UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
    cookiesMock.mockResolvedValue({ get: () => ({ value: "opaque-session" }) });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const fillValidPasswords = () => {
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Segura123" } });
    fireEvent.change(screen.getByLabelText("Repetir contraseña"), { target: { value: "Segura123" } });
  };

  it("uses the login card and title styling for activation", async () => {
    render(await ActivationPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByTestId("auth-card")).toHaveStyle({ maxWidth: "440px" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("auth-title");
    expect(screen.getByRole("heading", { level: 1 })).toHaveStyle({ fontSize: "2.25rem", textAlign: "center" });
    expect(screen.getByRole("button", { name: "Activar cuenta" })).toHaveClass("login-submit");
  });

  it("renders confirmation with the login styling and a real login link", () => {
    render(React.createElement(ActivationConfirmPage));

    expect(screen.getByTestId("auth-card")).toHaveStyle({ maxWidth: "440px" });
    expect(screen.getByRole("heading", { level: 1, name: "Cuenta activada" })).toHaveClass("auth-title");
    expect(screen.getByText("Ya podés iniciar sesión con tu email y tu nueva contraseña.")).toBeVisible();
    const link = screen.getByRole("link", { name: "Ir al login" });
    expect(link).toHaveAttribute("href", "/login");
    expect(link).toHaveClass("login-submit");
    expect(link).toHaveStyle({ width: "100%", outlineOffset: "3px" });
  });

  it("keeps submission disabled while activation is pending", async () => {
    let resolveRequest!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { resolveRequest = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    render(React.createElement(ActivationForm));
    fillValidPasswords();
    fireEvent.click(screen.getByRole("button", { name: "Activar cuenta" }));

    const button = screen.getByRole("button", { name: "Activando..." });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(pushMock).not.toHaveBeenCalled();

    resolveRequest(new Response(JSON.stringify({ success: true, data: { message: "ok" } }), { status: 200 }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/activation/confirm"));
    expect(screen.getByRole("button", { name: "Activar cuenta" })).toBeEnabled();
  });

  it.each(["api", "network"])("shows accessible %s errors and enables retry", async (failure) => {
    const fetchMock = vi.fn();
    if (failure === "api") {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false, error: { message: "Token inválido o expirado" } }), { status: 400 }));
    } else {
      fetchMock.mockRejectedValue(new Error("Network unavailable"));
    }
    vi.stubGlobal("fetch", fetchMock);
    render(React.createElement(ActivationForm));
    fillValidPasswords();
    fireEvent.click(screen.getByRole("button", { name: "Activar cuenta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(failure === "api" ? "Token inválido o expirado" : "No se pudo activar la cuenta.");
    expect(screen.getByRole("button", { name: "Activar cuenta" })).toBeEnabled();
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("aria-describedby", "password-requirements password-feedback");
    expect(screen.getByLabelText("Repetir contraseña")).toHaveAttribute("aria-describedby", "password-requirements password-feedback");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it.each([
    { token: "legacy-token" },
    { token: "  fixture+/=?&#%token  ", recovery: "1" },
    { token: ["  legacy-token  ", "ignored-token"], recovery: ["1"] },
  ])("redirects a legacy bearer before cookie access or rendering: %j", async (params) => {
    const token = (Array.isArray(params.token) ? params.token[0] : params.token).trim();

    await expect(ActivationPage({ searchParams: Promise.resolve(params) })).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledExactlyOnceWith(`/activation/exchange?token=${encodeURIComponent(token)}`);
    expect(cookiesMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each([undefined, "", "   ", [], ["  ", "ignored-token"]])("renders the session form without redirecting for an absent or blank first token: %j", async (token) => {
    render(await ActivationPage({ searchParams: Promise.resolve({ token }) }));

    expect(screen.getByLabelText("Contraseña")).toBeVisible();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("opaque-session");
  });

  it("renders tokenless missing-session recovery without a redirect loop", async () => {
    cookiesMock.mockResolvedValue({ get: () => undefined });
    render(await ActivationPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo continuar con la activación.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("renders permanent, described password guidance without a dismiss path", () => {
    render(React.createElement(ActivationForm));

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("dialog", { name: "Elegí tu contraseña" })).toBeVisible();
    expect(document.querySelectorAll("input")).toHaveLength(2);
    for (const label of ["Contraseña", "Repetir contraseña"]) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute("type", "password");
      expect(input).toHaveAttribute("autocomplete", "new-password");
      expect(input).toBeRequired();
      expect(input).toHaveStyle({ width: "100%", outlineOffset: "3px" });
      expect(input.style.outline).not.toBe("none");
    }
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

  it.each(["1", ["1"]])("renders recovery instead of the form when its marker overrides a stale cookie: %j", async (recovery) => {
    render(await ActivationPage({ searchParams: Promise.resolve({ recovery }) }));

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo continuar con la activación.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("opaque-session");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
