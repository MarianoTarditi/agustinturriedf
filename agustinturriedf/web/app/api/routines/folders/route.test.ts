import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionMock = vi.fn();
const listFoldersMock = vi.fn();
const handleApiErrorMock = vi.fn((error: unknown) => ({
  status: 500,
  json: async () => ({ error: error instanceof Error ? error.message : "error" }),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/routines/service", () => ({
  routinesService: {
    listFolders: listFoldersMock,
  },
}));

vi.mock("@/lib/http/api-response", () => ({
  apiSuccess: (data: unknown, status = 200) => ({ status, json: async () => ({ data }) }),
  handleApiError: handleApiErrorMock,
}));

describe("GET /api/routines/folders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns folders for authorized actor", async () => {
    const actor = { id: "user-1", role: "ADMIN" as const };
    requireSessionMock.mockResolvedValue(actor);
    listFoldersMock.mockResolvedValue([
      {
        id: "folder-1",
        studentProfileId: "sp-1",
        studentUserId: "student-1",
        displayName: "Rutinas de Ana",
        storageKey: "student:ana@example.com",
        fileCount: 2,
        firstName: "Ana",
        lastName: "Pérez",
        email: "ana@example.com",
      },
    ]);

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      {
        id: "folder-1",
        studentProfileId: "sp-1",
        studentUserId: "student-1",
        displayName: "Rutinas de Ana",
        storageKey: "student:ana@example.com",
        fileCount: 2,
        firstName: "Ana",
        lastName: "Pérez",
        email: "ana@example.com",
      },
    ]);
    expect(body.data[0]).not.toHaveProperty("files");
    expect(listFoldersMock).toHaveBeenCalledWith(actor);
  });

  it("does not expose manual folder creation on this route", async () => {
    const routeModule = await import("./route");

    expect(Object.keys(routeModule)).toEqual(["GET"]);
    expect("POST" in routeModule).toBe(false);
    expect("PUT" in routeModule).toBe(false);
    expect("PATCH" in routeModule).toBe(false);
    expect("DELETE" in routeModule).toBe(false);
  });
});
