import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findFolderByStudentUserIdMock,
  listFoldersWithOwnershipMock,
  findFolderWithOwnershipByIdMock,
  createFileMock,
  updateFileStorageMock,
  deleteFileByIdMock,
  findFileByIdMock,
  findFileWithOwnershipByIdMock,
  ensureStudentRoutineDirectoryMock,
  writeRoutineFileToDiskMock,
  removeRoutineFileFromDiskMock,
  buildRoutineStorageFileNameMock,
  buildRoutineRelativePathMock,
  getRoutineAbsolutePathMock,
} = vi.hoisted(() => ({
  findFolderByStudentUserIdMock: vi.fn(),
  listFoldersWithOwnershipMock: vi.fn(),
  findFolderWithOwnershipByIdMock: vi.fn(),
  createFileMock: vi.fn(),
  updateFileStorageMock: vi.fn(),
  deleteFileByIdMock: vi.fn(),
  findFileByIdMock: vi.fn(),
  findFileWithOwnershipByIdMock: vi.fn(),
  ensureStudentRoutineDirectoryMock: vi.fn(),
  writeRoutineFileToDiskMock: vi.fn(),
  removeRoutineFileFromDiskMock: vi.fn(),
  buildRoutineStorageFileNameMock: vi.fn(),
  buildRoutineRelativePathMock: vi.fn(),
  getRoutineAbsolutePathMock: vi.fn(),
}));

vi.mock("@/features/routines/repository", () => ({
  routinesRepository: {
    findFolderByStudentUserId: findFolderByStudentUserIdMock,
    listFoldersWithOwnership: listFoldersWithOwnershipMock,
    findFolderWithOwnershipById: findFolderWithOwnershipByIdMock,
    createFile: createFileMock,
    updateFileStorage: updateFileStorageMock,
    deleteFileById: deleteFileByIdMock,
    findFileById: findFileByIdMock,
    findFileWithOwnershipById: findFileWithOwnershipByIdMock,
  },
}));

vi.mock("@/features/routines/storage", () => ({
  ensureStudentRoutineDirectory: ensureStudentRoutineDirectoryMock,
  writeRoutineFileToDisk: writeRoutineFileToDiskMock,
  removeRoutineFileFromDisk: removeRoutineFileFromDiskMock,
  buildRoutineStorageFileName: buildRoutineStorageFileNameMock,
  buildRoutineRelativePath: buildRoutineRelativePathMock,
  getRoutineAbsolutePath: getRoutineAbsolutePathMock,
}));

import { routinesService } from "@/features/routines/service";

describe("RoutinesService permissions and business rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureStudentRoutineDirectoryMock.mockResolvedValue(undefined);
    writeRoutineFileToDiskMock.mockResolvedValue(undefined);
    removeRoutineFileFromDiskMock.mockResolvedValue(undefined);
    deleteFileByIdMock.mockResolvedValue(undefined);
    buildRoutineStorageFileNameMock.mockReturnValue("plan--file-1.pdf");
    buildRoutineRelativePathMock.mockReturnValue("sp-1/plan--file-1.pdf");
    getRoutineAbsolutePathMock.mockReturnValue("/tmp/sp-1/plan--file-1.pdf");
  });

  it("allows STUDENT to list only own folder", async () => {
    findFolderByStudentUserIdMock.mockResolvedValue({
      id: "folder-1",
      studentProfileId: "sp-1",
      displayName: "Rutinas de Alumno Uno",
      storageKey: "student:alumno@demo.com",
      studentProfile: { userId: "student-1" },
      files: [],
    });

    const result = await routinesService.listFolders({ id: "student-1", role: "STUDENT" });

    expect(findFolderByStudentUserIdMock).toHaveBeenCalledWith("student-1");
    expect(listFoldersWithOwnershipMock).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "folder-1",
      studentUserId: "student-1",
    });
  });

  it("rejects STUDENT trying to read another student's folder", async () => {
    findFolderWithOwnershipByIdMock.mockResolvedValue({
      id: "folder-2",
      studentProfileId: "sp-2",
      displayName: "Rutinas de Otro",
      storageKey: "student:otro@demo.com",
      studentProfile: { userId: "student-2" },
      files: [],
    });

    await expect(
      routinesService.listFolderFiles({ id: "student-1", role: "STUDENT" }, "folder-2")
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("rejects upload when extension is not allowed", async () => {
    findFolderWithOwnershipByIdMock.mockResolvedValue({
      id: "folder-1",
      studentProfileId: "sp-1",
      displayName: "Rutinas",
      storageKey: "student:demo@demo.com",
      studentProfile: { userId: "student-1" },
      files: [],
    });

    await expect(
      routinesService.uploadFile(
        { id: "trainer-1", role: "TRAINER" },
        {
          folderId: "folder-1",
          originalName: "plan.doc",
          sizeBytes: 120,
          content: Buffer.from("contenido"),
        }
      )
    ).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
    });

    expect(createFileMock).not.toHaveBeenCalled();
  });

  it("maps duplicate filename DB error to CONFLICT", async () => {
    findFolderWithOwnershipByIdMock.mockResolvedValue({
      id: "folder-1",
      studentProfileId: "sp-1",
      displayName: "Rutinas",
      storageKey: "student:demo@demo.com",
      studentProfile: { userId: "student-1" },
      files: [],
    });

    createFileMock.mockRejectedValue({
      code: "P2002",
      meta: { target: ["folderId", "normalizedName"] },
    });

    await expect(
      routinesService.uploadFile(
        { id: "admin-1", role: "ADMIN" },
        {
          folderId: "folder-1",
          originalName: "rutina.pdf",
          sizeBytes: 250,
          content: Buffer.from("abc"),
        }
      )
    ).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
    });
  });

  it("uploads valid file and persists metadata/path", async () => {
    findFolderWithOwnershipByIdMock.mockResolvedValue({
      id: "folder-1",
      studentProfileId: "sp-1",
      displayName: "Rutinas",
      storageKey: "student:demo@demo.com",
      studentProfile: { userId: "student-1" },
      files: [],
    });

    createFileMock.mockResolvedValue({
      id: "file-1",
      folderId: "folder-1",
      originalName: "Plan Fuerza.PDF",
      normalizedName: "plan fuerza.pdf",
      extension: "pdf",
      relativePath: "pending",
      sizeBytes: 3,
      observations: "ok",
      uploadedAt: new Date("2026-04-19T12:00:00.000Z"),
    });

    updateFileStorageMock.mockResolvedValue({
      id: "file-1",
      originalName: "Plan Fuerza.PDF",
      extension: "pdf",
      relativePath: "sp-1/plan--file-1.pdf",
      sizeBytes: 3,
      observations: "ok",
      uploadedAt: new Date("2026-04-19T12:00:00.000Z"),
    });

    const result = await routinesService.uploadFile(
      { id: "trainer-1", role: "TRAINER" },
      {
        folderId: "folder-1",
        originalName: "Plan Fuerza.PDF",
        sizeBytes: 999,
        observations: "  ok  ",
        content: Buffer.from("abc"),
      }
    );

    expect(createFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        folderId: "folder-1",
        extension: "pdf",
        normalizedName: "plan fuerza.pdf",
        sizeBytes: 3,
        observations: "ok",
      })
    );
    expect(ensureStudentRoutineDirectoryMock).toHaveBeenCalledWith("sp-1");
    expect(writeRoutineFileToDiskMock).toHaveBeenCalledWith("/tmp/sp-1/plan--file-1.pdf", Buffer.from("abc"));
    expect(updateFileStorageMock).toHaveBeenCalledWith("file-1", {
      relativePath: "sp-1/plan--file-1.pdf",
      normalizedName: "plan fuerza.pdf",
    });
    expect(result).toMatchObject({
      id: "file-1",
      name: "Plan Fuerza.PDF",
      type: "pdf",
      path: "sp-1/plan--file-1.pdf",
      sizeBytes: 3,
      observations: "ok",
    });
  });

  it("allows STUDENT to access own file metadata but not foreign file", async () => {
    findFileWithOwnershipByIdMock.mockResolvedValueOnce({
      id: "file-own",
      originalName: "mi-rutina.xlsx",
      extension: "xlsx",
      relativePath: "sp-1/mi-rutina.xlsx",
      uploadedAt: new Date("2026-04-19T10:00:00.000Z"),
      sizeBytes: 120,
      observations: null,
      folder: {
        studentProfile: {
          id: "sp-1",
          userId: "student-1",
        },
      },
    });

    const ownResult = await routinesService.getFile({ id: "student-1", role: "STUDENT" }, "file-own");

    expect(ownResult).toMatchObject({
      id: "file-own",
      type: "xlsx",
    });

    findFileWithOwnershipByIdMock.mockResolvedValueOnce({
      id: "file-other",
      originalName: "otro.pdf",
      extension: "pdf",
      relativePath: "sp-2/otro.pdf",
      uploadedAt: new Date("2026-04-19T10:00:00.000Z"),
      sizeBytes: 80,
      observations: null,
      folder: {
        studentProfile: {
          id: "sp-2",
          userId: "student-2",
        },
      },
    });

    await expect(routinesService.getFile({ id: "student-1", role: "STUDENT" }, "file-other")).rejects.toMatchObject(
      {
        status: 403,
        code: "FORBIDDEN",
      }
    );
  });

  it("deletes file from db and attempts disk cleanup for ADMIN/TRAINER", async () => {
    findFileByIdMock.mockResolvedValue({
      id: "file-1",
      originalName: "rutina.xls",
      extension: "xls",
      relativePath: "sp-1/rutina.xls",
      uploadedAt: new Date("2026-04-19T11:00:00.000Z"),
      sizeBytes: 350,
      observations: null,
    });

    getRoutineAbsolutePathMock.mockReturnValue("/tmp/sp-1/rutina.xls");

    const deleted = await routinesService.deleteFile({ id: "admin-1", role: "ADMIN" }, "file-1");

    expect(deleteFileByIdMock).toHaveBeenCalledWith("file-1");
    expect(removeRoutineFileFromDiskMock).toHaveBeenCalledWith("/tmp/sp-1/rutina.xls");
    expect(deleted).toMatchObject({
      id: "file-1",
      name: "rutina.xls",
      type: "xls",
    });
  });
});
