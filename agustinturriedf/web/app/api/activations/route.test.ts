import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const { activateMock, cookiesMock } = vi.hoisted(() => ({
  activateMock: vi.fn(),
  cookiesMock: vi.fn(),
}));

vi.mock("@/features/invitations/activation", () => ({
  activationPrimitives: {
    activate: activateMock,
  },
}));

vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { POST } from "@/app/api/activations/route";
import { ACTIVATION_SUCCESS_MESSAGE } from "@/app/api/activations/contract";
import { ApiError } from "@/lib/http/api-response";

describe("POST /api/activations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookiesMock.mockResolvedValue({ get: (name: string) => name === "activation_session" ? { value: "opaque-session" } : undefined });
  });

  it("activates from the HttpOnly session and clears it without returning the session", async () => {
    activateMock.mockResolvedValue({ userId: "user-1" });

    const response = await POST(
      new Request("http://localhost/api/activations", {
        method: "POST",
        body: JSON.stringify({
          password: "Segura123",
          confirmPassword: "Segura123",
        }),
        headers: { "Content-Type": "application/json", Cookie: "activation_session=opaque-session" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: { message: ACTIVATION_SUCCESS_MESSAGE },
    });
    expect(activateMock).toHaveBeenCalledWith({ password: "Segura123", session: "opaque-session" });
    expect(response.headers.get("set-cookie")).toContain("activation_session=;");
    expect(JSON.stringify({ body, headers: [...response.headers] })).not.toContain("opaque-session");
  });

  it("returns 400 when activation payload is invalid", async () => {
    const response = await POST(
      new Request("http://localhost/api/activations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "123",
          confirmPassword: "123",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Validation failed" },
    });
  });

  it("returns generic recovery for a missing, expired, or replayed session", async () => {
    cookiesMock.mockResolvedValue({ get: () => undefined });
    const response = await POST(
      new Request("http://localhost/api/activations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "Segura123", confirmPassword: "Segura123" }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: "INVALID_ACTIVATION", message: "No se pudo continuar con la activación." },
    });
  });

  it("does not expose an expired or replayed session failure", async () => {
    activateMock.mockRejectedValue(new ApiError("Token inválido o expirado", 400, "INVALID_OR_EXPIRED_TOKEN"));
    const response = await POST(
      new Request("http://localhost/api/activations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "Segura123", confirmPassword: "Segura123" }),
      })
    );

    expect(await response.json()).toMatchObject({ error: { code: "INVALID_ACTIVATION", message: "No se pudo continuar con la activación." } });
    expect(response.headers.get("set-cookie")).toMatch(/activation_session=;.*Max-Age=0/i);
  });

  it("does not export non-handler symbols from route module", () => {
    const routeSource = readFileSync(path.join(process.cwd(), "app", "api", "activations", "route.ts"), "utf8");

    expect(routeSource).not.toContain("export { ACTIVATION_SUCCESS_MESSAGE }");
  });
});
