import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { createInvitationRuntime, fetchUsersRuntime } from "@/app/(private)/usuarios/runtime";

describe("usuarios runtime", () => {
  it("fetches users and maps first row for render", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            id: "u-1",
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
