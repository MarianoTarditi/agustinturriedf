import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findFolderSummaryByIdMock,
  createFolderMock,
  findFolderByIdMock,
  deleteFolderMock,
  removeVideotecaFolderDirectoryMock,
} = vi.hoisted(() => ({
  findFolderSummaryByIdMock: vi.fn(),
  createFolderMock: vi.fn(),
  findFolderByIdMock: vi.fn(),
  deleteFolderMock: vi.fn(),
  removeVideotecaFolderDirectoryMock: vi.fn(),
}));

vi.mock("@/features/auth/authorization", async () => {
  const actual = await vi.importActual<typeof import("@/features/auth/authorization")>(
    "@/features/auth/authorization"
  );

  return {
    ...actual,
    requireRole: vi.fn(),
  };
});

vi.mock("@/features/videoteca/repository", () => ({
  videotecaRepository: {
    findFolderSummaryById: findFolderSummaryByIdMock,
    createFolder: createFolderMock,
    findFolderById: findFolderByIdMock,
    deleteFolder: deleteFolderMock,
  },
}));

vi.mock("@/features/videoteca/storage", async () => {
  const actual = await vi.importActual<typeof import("@/features/videoteca/storage")>(
    "@/features/videoteca/storage"
  );

  return {
    ...actual,
    removeVideotecaFolderDirectory: removeVideotecaFolderDirectoryMock,
  };
});

import { videotecaService } from "@/features/videoteca/service";

describe("VideotecaService folder hierarchy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    removeVideotecaFolderDirectoryMock.mockResolvedValue(undefined);
  });

  it("rejects child-folder creation when parent does not exist", async () => {
    findFolderSummaryByIdMock.mockResolvedValue(null);

    await expect(
      videotecaService.createFolder(
        { id: "trainer-1", role: "TRAINER" },
        {
          name: "Subcarpeta",
          parentId: "missing-parent",
        }
      )
    ).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
      message: "La carpeta padre no existe",
    });

    expect(createFolderMock).not.toHaveBeenCalled();
  });

  it("creates child folder linked to parentId", async () => {
    findFolderSummaryByIdMock.mockResolvedValue({
      id: "folder-parent-1",
      name: "Padre",
      parentId: null,
      updatedAt: new Date("2026-04-25T12:00:00.000Z"),
      _count: {
        files: 2,
      },
    });

    createFolderMock.mockResolvedValue({
      id: "folder-child-1",
      name: "Hija",
      parentId: "folder-parent-1",
      updatedAt: new Date("2026-04-25T12:01:00.000Z"),
      _count: {
        files: 0,
      },
    });

    const result = await videotecaService.createFolder(
      { id: "trainer-1", role: "TRAINER" },
      {
        name: "Hija",
        parentId: "folder-parent-1",
      }
    );

    expect(createFolderMock).toHaveBeenCalledWith("Hija", "folder-parent-1");
    expect(result).toMatchObject({
      id: "folder-child-1",
      parentId: "folder-parent-1",
      fileCount: 0,
    });
  });

  it("prevents deleting a folder that still has child folders", async () => {
    findFolderByIdMock.mockResolvedValue({
      id: "folder-parent-1",
      name: "Padre",
      parentId: null,
      updatedAt: new Date("2026-04-25T12:00:00.000Z"),
      parent: null,
      children: [
        {
          id: "folder-child-1",
          name: "Hija",
          parentId: "folder-parent-1",
          updatedAt: new Date("2026-04-25T12:01:00.000Z"),
          _count: {
            files: 0,
          },
        },
      ],
      files: [],
    });

    await expect(
      videotecaService.deleteFolder({ id: "admin-1", role: "ADMIN" }, "folder-parent-1")
    ).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      message: "No se puede eliminar una carpeta que todavía tiene subcarpetas",
    });

    expect(deleteFolderMock).not.toHaveBeenCalled();
  });
});
