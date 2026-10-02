import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { archiveUserRuntime, createInvitationRuntime, fetchUsersRuntime } from "@/app/(private)/usuarios/runtime";

describe("usuarios runtime", () => {
  it("archives with the current version and trimmed reason", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: true, data: { id: "u/1", status: "ARCHIVED", version: 8 } }));
    await archiveUserRuntime(fetchMock, "u/1", 7, "  Account closure  ");
    expect(fetchMock).toHaveBeenCalledWith("/api/users/u%2F1/transitions", expect.objectContaining({
      method: "PATCH", body: JSON.stringify({ targetStatus: "ARCHIVED", expectedVersion: 7, reason: "Account closure" }),
    }));
  });

  it.each(["", "   ", "x".repeat(501)])("rejects invalid reason before fetching: %s", async (reason) => {
    const fetchMock = vi.fn();
    await expect(archiveUserRuntime(fetchMock, "u-1", 7, reason)).rejects.toThrow("motivo");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([undefined, 0, 1.5, NaN])("never invents an invalid version: %s", async (version) => {
    const fetchMock = vi.fn();
    await expect(archiveUserRuntime(fetchMock, "u-1", version as number, "Closure")).rejects.toThrow("versión");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["", "<html>Error</html>", "null", "{}", '{"success":true}', '{"success":false,"error":{}}'])
    ("handles malformed or empty archive responses: %s", async (body) => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(body));
      await expect(archiveUserRuntime(fetchMock, "u-1", 7, "Closure")).rejects.toThrow("No se pudo confirmar");
    });

  it.each([403, 409, 500])("preserves API error messages (%s)", async (status) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: false, error: { message: "Account version is stale" } }, { status }));
    await expect(archiveUserRuntime(fetchMock, "u-1", 7, "Closure")).rejects.toThrow("Account version is stale");
  });

  it.each([
    { id: "other", status: "ARCHIVED", version: 8 },
    { id: "u-1", status: "ACTIVE", version: 8 },
    { id: "u-1", status: "ARCHIVED", version: 7 },
    { id: "u-1", status: "ARCHIVED", version: 6 },
    { id: "u-1", status: "ARCHIVED", version: 8.5 },
    { id: "u-1", status: "ARCHIVED", version: "8" },
  ])("rejects an unconfirmed archive response: %j", async (data) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: true, data }));
    await expect(archiveUserRuntime(fetchMock, "u-1", 7, "Archivado desde la gestión de usuarios.")).rejects.toThrow("No se pudo confirmar");
  });

  it.each(["", "<html>Gateway error</html>"])("handles non-JSON HTTP failures: %s", async (body) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(body, { status: 502 }));
    await expect(archiveUserRuntime(fetchMock, "u-1", 7, "Closure")).rejects.toThrow("No se pudo confirmar");
  });

  it("excludes archived users on reload and uses canonical account status", async () => {
    const user = { id: "u-1", firstName: "Ana", lastName: "Gomez", role: "STUDENT", version: 9, studentProfile: { status: "ACTIVE" } };
    const fetchMock = vi.fn().mockImplementation(async () => Response.json({ success: true, data: [
      { ...user, status: "INACTIVE" }, { ...user, id: "archived", status: "ARCHIVED" },
    ] }));
    for (let i = 0; i < 2; i++) {
      const rows = await fetchUsersRuntime(fetchMock);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id: "u-1", status: "Inactivo", version: 9 });
    }
  });
  it("fetches users and maps first row for render", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            id: "u-1",
            status: "ACTIVE",
            version: 7,
            firstName: "Ana",
            lastName: "Gomez",
            email: "ana@example.com",
            role: "TRAINER",
            createdAt: "2026-01-01T00:00:00.000Z",
            studentProfile: null,
          },
        ],
      }),
    });

    const rows = await fetchUsersRuntime(fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledWith("/api/users", expect.objectContaining({ method: "GET" }));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "u-1",
      name: "Ana Gomez",
      email: "ana@example.com",
      role: "trainer",
      status: "Activo",
    });
  });

  it("throws API error message when fetch fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          message: "Cuenta bloqueada",
        },
      }),
    });

    await expect(fetchUsersRuntime(fetchMock as unknown as typeof fetch)).rejects.toThrow("Cuenta bloqueada");
  });

  it("creates invitation through /api/invitations endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: "inv-1",
          email: "ana@example.com",
          firstName: "Ana",
          lastName: "Gomez",
          trainerId: "c123456789012345678901234",
          status: "SENT",
          expiresAt: "2026-05-01T00:00:00.000Z",
          createdAt: "2026-04-30T00:00:00.000Z",
        },
      }),
    });

    const invitation = await createInvitationRuntime(fetchMock as unknown as typeof fetch, {
      firstName: "Ana",
      lastName: "Gomez",
      email: "ana@example.com",
      phone: null,
      role: "STUDENT",
      trainerId: "c123456789012345678901234",
      studentStatus: "ACTIVE",
      initialPaymentStartDate: "2026-05-01",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/invitations",
      expect.objectContaining({ method: "POST" })
    );
    expect(invitation.id).toBe("inv-1");
  });

  it("removes bootstrap password copy from usuarios modal", () => {
    const source = readFileSync(path.join(process.cwd(), "app", "(private)", "usuarios", "page.tsx"), "utf8");

    expect(source).not.toContain("123456789");
    expect(source).toContain("email de activación");
  });
});
