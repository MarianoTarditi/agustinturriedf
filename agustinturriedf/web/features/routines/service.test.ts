import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findFolderByStudentUserIdMock,
  listFolderSummariesWithOwnershipMock,
  findFolderWithOwnershipByIdMock,
  createFileMock,
  updateFileStorageMock,
  updateFileMetadataMock,
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
  listFolderSummariesWithOwnershipMock: vi.fn(),
  findFolderWithOwnershipByIdMock: vi.fn(),
  createFileMock: vi.fn(),
  updateFileStorageMock: vi.fn(),
  updateFileMetadataMock: vi.fn(),
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
    listFolderSummariesWithOwnership: listFolderSummariesWithOwnershipMock,
    findFolderWithOwnershipById: findFolderWithOwnershipByIdMock,
    createFile: createFileMock,
    updateFileStorage: updateFileStorageMock,
    updateFileMetadata: updateFileMetadataMock,
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
      studentProfile: {
        userId: "student-1",
        user: {
          firstName: "Alumno",
          lastName: "Uno",
          email: "alumno@demo.com",
        },
      },
      files: [],
    });

    const result = await routinesService.listFolders({ id: "student-1", role: "STUDENT" });

    expect(findFolderByStudentUserIdMock).toHaveBeenCalledWith("student-1");
    expect(listFolderSummariesWithOwnershipMock).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "folder-1",
      studentUserId: "student-1",
      fileCount: 0,
      firstName: "Alumno",
      lastName: "Uno",
      email: "alumno@demo.com",
    });
    expect(result[0]).not.toHaveProperty("files");
  });

  it("returns summary list for staff without exposing files arrays", async () => {
    listFolderSummariesWithOwnershipMock.mockResolvedValue([
      {
        id: "folder-2",
        studentProfileId: "sp-2",
        displayName: "Rutinas de Pedro",
        storageKey: "student:pedro@demo.com",
        studentProfile: {
          userId: "student-2",
          user: {
            firstName: "Pedro",
            lastName: "Gómez",
            email: "pedro@demo.com",
          },
        },
        _count: { files: 3 },
      },
    ]);

    const result = await routinesService.listFolders({ id: "trainer-1", role: "TRAINER" });

    expect(listFolderSummariesWithOwnershipMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        id: "folder-2",
        studentProfileId: "sp-2",
        studentUserId: "student-2",
        displayName: "Rutinas de Pedro",
        storageKey: "student:pedro@demo.com",
        fileCount: 3,
        firstName: "Pedro",
        lastName: "Gómez",
        email: "pedro@demo.com",
      },
    ]);
    expect(result[0]).not.toHaveProperty("files");
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

  it("replaces file when there is exactly one name match", async () => {
    findFolderWithOwnershipByIdMock.mockResolvedValue({
      id: "folder-1",
      studentProfileId: "sp-1",
      displayName: "Rutinas",
      storageKey: "student:demo@demo.com",
      studentProfile: { userId: "student-1" },
      files: [
        {
          id: "file-1",
          originalName: "Rutina.PDF",
          normalizedName: "rutina.pdf",
          extension: "pdf",
          relativePath: "sp-1/rutina--file-1.pdf",
          sizeBytes: 2,
          observations: "prev",
          uploadedAt: new Date("2026-04-19T08:00:00.000Z"),
        },
      ],
    });

    updateFileMetadataMock.mockResolvedValue({
      id: "file-1",
      originalName: "rutina.pdf",
      extension: "pdf",
      relativePath: "sp-1/plan--file-1.pdf",
      sizeBytes: 3,
      observations: null,
      uploadedAt: new Date("2026-04-20T12:00:00.000Z"),
    });

    const result = await routinesService.uploadFile(
      { id: "admin-1", role: "ADMIN" },
      {
        folderId: "folder-1",
        originalName: "rutina.pdf",
        sizeBytes: 250,
        content: Buffer.from("abc"),
      }
    );

    expect(createFileMock).not.toHaveBeenCalled();
    expect(updateFileMetadataMock).toHaveBeenCalledWith(
      "file-1",
      expect.objectContaining({
        originalName: "rutina.pdf",
        normalizedName: "rutina.pdf",
        extension: "pdf",
      })
    );
    expect(result).toMatchObject({
      id: "file-1",
      name: "rutina.pdf",
      type: "pdf",
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

  it("uploads files in append mode without replacement heuristics", async () => {
    findFolderWithOwnershipByIdMock.mockResolvedValue({
      id: "folder-1",
      studentProfileId: "sp-1",
      displayName: "Rutinas",
      storageKey: "student:demo@demo.com",
      studentProfile: { userId: "student-1" },
      files: [
        {
          id: "file-existing",
          originalName: "plan.pdf",
          normalizedName: "plan.pdf",
          extension: "pdf",
          relativePath: "sp-1/plan--file-existing.pdf",
          sizeBytes: 111,
          observations: null,
          uploadedAt: new Date("2026-04-19T08:00:00.000Z"),
        },
      ],
    });

    createFileMock
      .mockResolvedValueOnce({
        id: "file-a",
        folderId: "folder-1",
        originalName: "plan.pdf",
        normalizedName: "plan.pdf",
        extension: "pdf",
        relativePath: "pending",
        sizeBytes: 3,
        observations: null,
        uploadedAt: new Date("2026-04-24T12:00:00.000Z"),
      })
      .mockResolvedValueOnce({
        id: "file-b",
        folderId: "folder-1",
        originalName: "tabla.xlsx",
        normalizedName: "tabla.xlsx",
        extension: "xlsx",
        relativePath: "pending",
        sizeBytes: 4,
        observations: null,
        uploadedAt: new Date("2026-04-24T12:00:01.000Z"),
      });

    updateFileStorageMock
      .mockResolvedValueOnce({
        id: "file-a",
        originalName: "plan.pdf",
        extension: "pdf",
        relativePath: "sp-1/plan--file-a.pdf",
        sizeBytes: 3,
        observations: null,
        uploadedAt: new Date("2026-04-24T12:00:00.000Z"),
      })
      .mockResolvedValueOnce({
        id: "file-b",
        originalName: "tabla.xlsx",
        extension: "xlsx",
        relativePath: "sp-1/tabla--file-b.xlsx",
        sizeBytes: 4,
        observations: null,
        uploadedAt: new Date("2026-04-24T12:00:01.000Z"),
      });

    const result = await routinesService.uploadFilesAppend(
      { id: "trainer-1", role: "TRAINER" },
      {
        folderId: "folder-1",
        files: [
          {
            originalName: "plan.pdf",
            sizeBytes: 3,
            content: Buffer.from("abc"),
          },
          {
            originalName: "tabla.xlsx",
            sizeBytes: 4,
            content: Buffer.from("abcd"),
          },
        ],
      }
    );

    expect(updateFileMetadataMock).not.toHaveBeenCalled();
    expect(createFileMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "file-a", name: "plan.pdf" });
    expect(result[1]).toMatchObject({ id: "file-b", name: "tabla.xlsx" });
  });

  it("replaces by file type when there is a single same-type candidate", async () => {
    findFolderWithOwnershipByIdMock.mockResolvedValue({
      id: "folder-1",
      studentProfileId: "sp-1",
      displayName: "Rutinas",
      storageKey: "student:demo@demo.com",
      studentProfile: { userId: "student-1" },
      files: [
        {
          id: "file-pdf",
          originalName: "semana-1.pdf",
          normalizedName: "semana-1.pdf",
          extension: "pdf",
          relativePath: "sp-1/semana-1--file-pdf.pdf",
          sizeBytes: 200,
          observations: null,
          uploadedAt: new Date("2026-04-18T12:00:00.000Z"),
        },
      ],
    });

    updateFileMetadataMock.mockResolvedValue({
      id: "file-pdf",
      originalName: "nuevo-plan.pdf",
      extension: "pdf",
      relativePath: "sp-1/plan--file-1.pdf",
      sizeBytes: 3,
      observations: null,
      uploadedAt: new Date("2026-04-20T12:00:00.000Z"),
    });

    const result = await routinesService.uploadFile(
      { id: "trainer-1", role: "TRAINER" },
      {
        folderId: "folder-1",
        originalName: "nuevo-plan.pdf",
        sizeBytes: 3,
        content: Buffer.from("abc"),
      }
    );

    expect(createFileMock).not.toHaveBeenCalled();
    expect(updateFileMetadataMock).toHaveBeenCalledWith(
      "file-pdf",
      expect.objectContaining({
        originalName: "nuevo-plan.pdf",
      })
    );
    expect(result.id).toBe("file-pdf");
  });

  it("returns AMBIGUOUS_REPLACEMENT when multiple same-type candidates exist", async () => {
    findFolderWithOwnershipByIdMock.mockResolvedValue({
      id: "folder-1",
      studentProfileId: "sp-1",
      displayName: "Rutinas",
      storageKey: "student:demo@demo.com",
      studentProfile: { userId: "student-1" },
      files: [
        {
          id: "file-1",
          originalName: "semana-1.pdf",
          normalizedName: "semana-1.pdf",
          extension: "pdf",
          relativePath: "sp-1/semana-1--file-1.pdf",
          sizeBytes: 200,
          observations: null,
          uploadedAt: new Date("2026-04-18T12:00:00.000Z"),
        },
        {
          id: "file-2",
          originalName: "semana-2.pdf",
          normalizedName: "semana-2.pdf",
          extension: "pdf",
          relativePath: "sp-1/semana-2--file-2.pdf",
          sizeBytes: 220,
          observations: null,
          uploadedAt: new Date("2026-04-17T12:00:00.000Z"),
        },
      ],
    });

    await expect(
      routinesService.uploadFile(
        { id: "trainer-1", role: "TRAINER" },
        {
          folderId: "folder-1",
          originalName: "nuevo-plan.pdf",
          sizeBytes: 3,
          content: Buffer.from("abc"),
        }
      )
    ).rejects.toMatchObject({
      status: 409,
      code: "AMBIGUOUS_REPLACEMENT",
    });

    expect(createFileMock).not.toHaveBeenCalled();
    expect(updateFileMetadataMock).not.toHaveBeenCalled();
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
