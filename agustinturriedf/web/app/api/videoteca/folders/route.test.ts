import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, listFoldersMock, createFolderMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  listFoldersMock: vi.fn(),
  createFolderMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/videoteca/service", () => ({
  videotecaService: {
    listFolders: listFoldersMock,
    createFolder: createFolderMock,
  },
}));

import { GET, POST } from "@/app/api/videoteca/folders/route";

describe("GET /api/videoteca/folders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns videoteca folders", async () => {
    const actor = { id: "trainer-1", role: "TRAINER" as const };
    requireSessionMock.mockResolvedValue(actor);
    listFoldersMock.mockResolvedValue([
      {
        id: "folder-1",
        name: "Rodilla",
        parentId: null,
        updatedAt: "23 abr 2026",
        fileCount: 4,
        tags: [],
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      data: [
        {
          id: "folder-1",
          name: "Rodilla",
          fileCount: 4,
        },
      ],
    });
    expect(listFoldersMock).toHaveBeenCalledWith(actor);
  });

  it("creates folder and returns 201", async () => {
    const actor = { id: "trainer-1", role: "TRAINER" as const };
    requireSessionMock.mockResolvedValue(actor);
    createFolderMock.mockResolvedValue({
      id: "folder-99",
      name: "Nueva carpeta",
      parentId: null,
      updatedAt: "23 abr 2026",
      fileCount: 0,
      tags: [],
    });

    const response = await POST(
      new Request("http://localhost/api/videoteca/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Nueva carpeta" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      success: true,
      data: {
        id: "folder-99",
        name: "Nueva carpeta",
      },
    });
    expect(createFolderMock).toHaveBeenCalledWith(actor, { name: "Nueva carpeta" });
  });

  it("returns validation error when create payload is invalid", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });

    const response = await POST(
      new Request("http://localhost/api/videoteca/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
      },
    });
    expect(createFolderMock).not.toHaveBeenCalled();
  });

  it("creates child folder with parentId", async () => {
    const actor = { id: "trainer-1", role: "TRAINER" as const };
    requireSessionMock.mockResolvedValue(actor);
    createFolderMock.mockResolvedValue({
      id: "folder-child-1",
      name: "Técnica",
      parentId: "folder-1",
      updatedAt: "24 abr 2026",
      fileCount: 0,
      tags: [],
    });

    const response = await POST(
      new Request("http://localhost/api/videoteca/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Técnica", parentId: "folder-1" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      success: true,
      data: {
        id: "folder-child-1",
        parentId: "folder-1",
      },
    });
    expect(createFolderMock).toHaveBeenCalledWith(actor, {
      name: "Técnica",
      parentId: "folder-1",
    });
  });
});
