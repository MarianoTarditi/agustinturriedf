import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, getFolderDetailMock, renameFolderMock, deleteFolderMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  getFolderDetailMock: vi.fn(),
  renameFolderMock: vi.fn(),
  deleteFolderMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/videoteca/service", () => ({
  videotecaService: {
    getFolderDetail: getFolderDetailMock,
    renameFolder: renameFolderMock,
    deleteFolder: deleteFolderMock,
  },
}));

import { DELETE, GET, PATCH } from "@/app/api/videoteca/folders/[folderId]/route";

describe("GET /api/videoteca/folders/[folderId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns folder detail payload", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });
    getFolderDetailMock.mockResolvedValue({
      id: "folder-1",
      name: "Rodilla",
      parentId: null,
      updatedAt: "23 abr 2026",
      fileCount: 1,
      tags: [],
      parent: null,
      childFolders: [],
      files: [],
    });

    const folderId = "folder-1";
    const response = await GET(new Request(`http://localhost/api/videoteca/folders/${folderId}`), {
      params: Promise.resolve({ folderId }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      data: {
        id: folderId,
      },
    });
  });

  it("renames folder", async () => {
    const actor = { id: "trainer-1", role: "TRAINER" as const };
    requireSessionMock.mockResolvedValue(actor);
    renameFolderMock.mockResolvedValue({
      id: "folder-1",
      name: "Nuevo nombre",
      parentId: null,
      updatedAt: "23 abr 2026",
      fileCount: 5,
      tags: [],
    });

    const response = await PATCH(
      new Request("http://localhost/api/videoteca/folders/folder-1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Nuevo nombre" }),
      }),
      {
        params: Promise.resolve({ folderId: "folder-1" }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      data: {
        id: "folder-1",
        name: "Nuevo nombre",
      },
    });
    expect(renameFolderMock).toHaveBeenCalledWith(actor, "folder-1", {
      name: "Nuevo nombre",
    });
  });

  it("deletes folder", async () => {
    const actor = { id: "admin-1", role: "ADMIN" as const };
    requireSessionMock.mockResolvedValue(actor);
    deleteFolderMock.mockResolvedValue({
      id: "folder-1",
      name: "A borrar",
      parentId: null,
      updatedAt: "23 abr 2026",
      fileCount: 0,
      tags: [],
    });

    const response = await DELETE(
      new Request("http://localhost/api/videoteca/folders/folder-1", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({ folderId: "folder-1" }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      data: {
        id: "folder-1",
      },
    });
    expect(deleteFolderMock).toHaveBeenCalledWith(actor, "folder-1");
  });
});
