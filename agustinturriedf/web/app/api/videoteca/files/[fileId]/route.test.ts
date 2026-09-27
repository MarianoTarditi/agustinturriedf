import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, renameFileMock, deleteFileMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  renameFileMock: vi.fn(),
  deleteFileMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/videoteca/service", () => ({
  videotecaService: {
    renameFile: renameFileMock,
    deleteFile: deleteFileMock,
  },
}));

import { DELETE, PATCH } from "@/app/api/videoteca/files/[fileId]/route";

describe("/api/videoteca/files/[fileId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renames file", async () => {
    const actor = { id: "admin-1", role: "ADMIN" as const };
    requireSessionMock.mockResolvedValue(actor);
    renameFileMock.mockResolvedValue({
      id: "file-1",
      folderId: "folder-1",
      name: "nuevo-nombre.mp4",
      type: "video",
      extension: "mp4",
      duration: "—",
      updatedAt: "24 abr 2026",
      sizeBytes: 20,
      orderIndex: 1,
    });

    const response = await PATCH(
      new Request("http://localhost/api/videoteca/files/file-1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "nuevo-nombre.mp4" }),
      }),
      {
        params: Promise.resolve({ fileId: "file-1" }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      data: {
        id: "file-1",
        name: "nuevo-nombre.mp4",
      },
    });
    expect(renameFileMock).toHaveBeenCalledWith(actor, "file-1", {
      name: "nuevo-nombre.mp4",
    });
  });

  it("deletes file", async () => {
    const actor = { id: "trainer-1", role: "TRAINER" as const };
    requireSessionMock.mockResolvedValue(actor);
    deleteFileMock.mockResolvedValue({
      id: "file-1",
      folderId: "folder-1",
      name: "a-eliminar.jpg",
      type: "image",
      extension: "jpg",
      duration: "—",
      updatedAt: "24 abr 2026",
      sizeBytes: 10,
      orderIndex: 2,
    });

    const response = await DELETE(
      new Request("http://localhost/api/videoteca/files/file-1", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({ fileId: "file-1" }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      data: {
        id: "file-1",
      },
    });
    expect(deleteFileMock).toHaveBeenCalledWith(actor, "file-1");
  });

  it("returns validation error when fileId is empty", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    const response = await PATCH(
      new Request("http://localhost/api/videoteca/files/%20", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "x" }),
      }),
      {
        params: Promise.resolve({ fileId: " " }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
      },
    });
    expect(renameFileMock).not.toHaveBeenCalled();
  });
});
