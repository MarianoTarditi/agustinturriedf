import { describe, expect, it, vi } from "vitest";

import { fetchUsersRuntime } from "@/app/(private)/usuarios/runtime";

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
});
