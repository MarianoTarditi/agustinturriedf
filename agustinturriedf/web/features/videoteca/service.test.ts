import { beforeEach, describe, expect, it, vi } from "vitest";

import { VIDEOTECA_IMAGE_MAX_SIZE_BYTES } from "@/lib/validation/videoteca";

const {
  findFolderByIdMock,
  getNextOrderIndexMock,
  createFileMock,
  updateFileStorageMock,
  touchFolderMock,
  deleteFileByIdMock,
  ensureVideotecaFolderDirectoryMock,
  writeVideotecaFileStreamToDiskMock,
  removeVideotecaFileFromDiskMock,
  buildVideotecaStorageFileNameMock,
  buildVideotecaRelativePathMock,
  getVideotecaAbsolutePathMock,
  fileTypeFromBufferMock,
} = vi.hoisted(() => ({
  findFolderByIdMock: vi.fn(),
  getNextOrderIndexMock: vi.fn(),
  createFileMock: vi.fn(),
  updateFileStorageMock: vi.fn(),
  touchFolderMock: vi.fn(),
  deleteFileByIdMock: vi.fn(),
  ensureVideotecaFolderDirectoryMock: vi.fn(),
  writeVideotecaFileStreamToDiskMock: vi.fn(),
  removeVideotecaFileFromDiskMock: vi.fn(),
  buildVideotecaStorageFileNameMock: vi.fn(),
  buildVideotecaRelativePathMock: vi.fn(),
  getVideotecaAbsolutePathMock: vi.fn(),
  fileTypeFromBufferMock: vi.fn(),
}));

vi.mock("file-type", () => ({
  fileTypeFromBuffer: fileTypeFromBufferMock,
}));

vi.mock("@/features/videoteca/repository", () => ({
  videotecaRepository: {
    findFolderById: findFolderByIdMock,
    getNextOrderIndex: getNextOrderIndexMock,
    createFile: createFileMock,
    updateFileStorage: updateFileStorageMock,
    touchFolder: touchFolderMock,
    deleteFileById: deleteFileByIdMock,
  },
}));

vi.mock("@/features/videoteca/storage", () => ({
  ensureVideotecaFolderDirectory: ensureVideotecaFolderDirectoryMock,
  writeVideotecaFileStreamToDisk: writeVideotecaFileStreamToDiskMock,
  removeVideotecaFileFromDisk: removeVideotecaFileFromDiskMock,
  buildVideotecaStorageFileName: buildVideotecaStorageFileNameMock,
  buildVideotecaRelativePath: buildVideotecaRelativePathMock,
  getVideotecaAbsolutePath: getVideotecaAbsolutePathMock,
  VideotecaStorageSizeError: class VideotecaStorageSizeError extends Error {},
}));

import { videotecaService } from "@/features/videoteca/service";

const createUploadInput = ({
  originalName,
  content,
  declaredMimeType,
}: {
  originalName: string;
  content: Buffer;
  declaredMimeType?: string;
}) => ({
  originalName,
  sizeBytes: content.length,
  declaredMimeType,
  openStream: () =>
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(content));
        controller.close();
      },
    }),
});

describe("VideotecaService.uploadFiles validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    findFolderByIdMock.mockResolvedValue({
      id: "folder-1",
      name: "Piernas",
      updatedAt: new Date("2026-04-24T12:00:00.000Z"),
      files: [],
    });

    getNextOrderIndexMock.mockResolvedValue(1);

    createFileMock.mockImplementation(async (input: any) => ({
      id: "file-1",
      folderId: input.folderId,
      originalName: input.originalName,
      normalizedName: input.normalizedName,
      extension: input.extension,
      mediaType: input.mediaType,
      relativePath: "pending",
      sizeBytes: input.sizeBytes,
      orderIndex: input.orderIndex,
      updatedAt: new Date("2026-04-24T12:00:00.000Z"),
    }));

    updateFileStorageMock.mockImplementation(async (_fileId: string, relativePath: string) => ({
      id: "file-1",
      folderId: "folder-1",
      originalName: "video.mp4",
      normalizedName: "video.mp4",
      extension: "mp4",
      mediaType: "video",
      relativePath,
      sizeBytes: 3,
      orderIndex: 1,
      updatedAt: new Date("2026-04-24T12:00:00.000Z"),
    }));

    touchFolderMock.mockResolvedValue(undefined);
    deleteFileByIdMock.mockResolvedValue(undefined);
    ensureVideotecaFolderDirectoryMock.mockResolvedValue(undefined);
    writeVideotecaFileStreamToDiskMock.mockResolvedValue(undefined);
    removeVideotecaFileFromDiskMock.mockResolvedValue(undefined);

    buildVideotecaStorageFileNameMock.mockImplementation(
      ({ originalName, fileId, type }: { originalName: string; fileId: string; type: string }) =>
        `${originalName}--${fileId}.${type}`
    );
    buildVideotecaRelativePathMock.mockImplementation((folderId: string, storageName: string) => `${folderId}/${storageName}`);
    getVideotecaAbsolutePathMock.mockImplementation((relativePath: string) => `/tmp/${relativePath}`);
  });

  it("accepts upload when signature detection is unavailable and extension is allowed", async () => {
    fileTypeFromBufferMock.mockResolvedValue(undefined);

    const result = await videotecaService.uploadFiles(
      { id: "trainer-1", role: "TRAINER" },
      {
        folderId: "folder-1",
        files: [
            createUploadInput({
              originalName: "sentadilla.mp4",
              declaredMimeType: "application/octet-stream",
              content: Buffer.from("abc"),
            }),
          ],
        }
      );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      extension: "mp4",
      type: "video",
    });
    expect(createFileMock).toHaveBeenCalledTimes(1);
    expect(fileTypeFromBufferMock).toHaveBeenCalledWith(Buffer.from("abc"));
  });

  it("treats client MIME as advisory and accepts when extension + detected signature are compatible", async () => {
    fileTypeFromBufferMock.mockResolvedValue({ ext: "mp4", mime: "video/mp4" });

    await expect(
      videotecaService.uploadFiles(
        { id: "admin-1", role: "ADMIN" },
        {
          folderId: "folder-1",
          files: [
            createUploadInput({
              originalName: "clip.mp4",
              declaredMimeType: "image/png",
              content: Buffer.from("abc"),
            }),
          ],
        }
      )
    ).resolves.toHaveLength(1);

    expect(createFileMock).toHaveBeenCalledTimes(1);
  });

  it("rejects mismatched extension vs detected signature", async () => {
    fileTypeFromBufferMock.mockResolvedValue({ ext: "png", mime: "image/png" });

    await expect(
      videotecaService.uploadFiles(
        { id: "trainer-1", role: "TRAINER" },
        {
          folderId: "folder-1",
          files: [
            createUploadInput({
              originalName: "video.mp4",
              declaredMimeType: "video/mp4",
              content: Buffer.from("abc"),
            }),
          ],
        }
      )
    ).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "La extensión del archivo no coincide con su contenido real",
    });

    expect(createFileMock).not.toHaveBeenCalled();
  });

  it("keeps extension allowlist validation", async () => {
    fileTypeFromBufferMock.mockResolvedValue({ ext: "jpg", mime: "image/jpeg" });

    await expect(
      videotecaService.uploadFiles(
        { id: "trainer-1", role: "TRAINER" },
        {
          folderId: "folder-1",
          files: [
            createUploadInput({
              originalName: "plan.exe",
              content: Buffer.from("abc"),
            }),
          ],
        }
      )
    ).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
    });

    expect(createFileMock).not.toHaveBeenCalled();
  });

  it("keeps max-size validation", async () => {
    fileTypeFromBufferMock.mockResolvedValue(undefined);

    const oversizedImage = Buffer.alloc(VIDEOTECA_IMAGE_MAX_SIZE_BYTES + 1, 1);

    await expect(
      videotecaService.uploadFiles(
        { id: "trainer-1", role: "TRAINER" },
        {
          folderId: "folder-1",
          files: [
            createUploadInput({
              originalName: "plan.jpg",
              content: oversizedImage,
            }),
          ],
        }
      )
    ).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "La imagen supera el tamaño máximo de 10 MB",
    });

    expect(createFileMock).not.toHaveBeenCalled();
  });

  it("processes uploads sequentially while streaming each file", async () => {
    fileTypeFromBufferMock.mockResolvedValue(undefined);

    let releaseFirstWrite: (() => void) | undefined;
    writeVideotecaFileStreamToDiskMock
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            releaseFirstWrite = resolve;
          })
      )
      .mockResolvedValueOnce(undefined);

    createFileMock
      .mockImplementationOnce(async (input: any) => ({
        id: "file-1",
        folderId: input.folderId,
        originalName: input.originalName,
        normalizedName: input.normalizedName,
        extension: input.extension,
        mediaType: input.mediaType,
        relativePath: "pending",
        sizeBytes: input.sizeBytes,
        orderIndex: input.orderIndex,
        updatedAt: new Date("2026-04-24T12:00:00.000Z"),
      }))
      .mockImplementationOnce(async (input: any) => ({
        id: "file-2",
        folderId: input.folderId,
        originalName: input.originalName,
        normalizedName: input.normalizedName,
        extension: input.extension,
        mediaType: input.mediaType,
        relativePath: "pending",
        sizeBytes: input.sizeBytes,
        orderIndex: input.orderIndex,
        updatedAt: new Date("2026-04-24T12:00:00.000Z"),
      }));

    updateFileStorageMock
      .mockImplementationOnce(async (_fileId: string, relativePath: string) => ({
        id: "file-1",
        folderId: "folder-1",
        originalName: "uno.mp4",
        normalizedName: "uno.mp4",
        extension: "mp4",
        mediaType: "video",
        relativePath,
        sizeBytes: 3,
        orderIndex: 1,
        updatedAt: new Date("2026-04-24T12:00:00.000Z"),
      }))
      .mockImplementationOnce(async (_fileId: string, relativePath: string) => ({
        id: "file-2",
        folderId: "folder-1",
        originalName: "dos.mp4",
        normalizedName: "dos.mp4",
        extension: "mp4",
        mediaType: "video",
        relativePath,
        sizeBytes: 3,
        orderIndex: 2,
        updatedAt: new Date("2026-04-24T12:00:00.000Z"),
      }));

    const uploadPromise = videotecaService.uploadFiles(
      { id: "trainer-1", role: "TRAINER" },
      {
        folderId: "folder-1",
        files: [
          createUploadInput({ originalName: "uno.mp4", content: Buffer.from("abc") }),
          createUploadInput({ originalName: "dos.mp4", content: Buffer.from("def") }),
        ],
      }
    );

    await vi.waitFor(() => {
      expect(createFileMock).toHaveBeenCalledTimes(1);
    });

    releaseFirstWrite?.();
    await uploadPromise;

    expect(createFileMock).toHaveBeenCalledTimes(2);
    expect(createFileMock.mock.calls[0]?.[0]).toMatchObject({ originalName: "uno.mp4", orderIndex: 1 });
    expect(createFileMock.mock.calls[1]?.[0]).toMatchObject({ originalName: "dos.mp4", orderIndex: 2 });
    expect(writeVideotecaFileStreamToDiskMock).toHaveBeenCalledTimes(2);
  });

  it("rolls back previously persisted files and DB rows when a later stream write fails", async () => {
    fileTypeFromBufferMock.mockResolvedValue(undefined);

    const streamFailure = new Error("stream write interrupted");

    createFileMock
      .mockImplementationOnce(async (input: any) => ({
        id: "file-1",
        folderId: input.folderId,
        originalName: input.originalName,
        normalizedName: input.normalizedName,
        extension: input.extension,
        mediaType: input.mediaType,
        relativePath: "pending",
        sizeBytes: input.sizeBytes,
        orderIndex: input.orderIndex,
        updatedAt: new Date("2026-04-24T12:00:00.000Z"),
      }))
      .mockImplementationOnce(async (input: any) => ({
        id: "file-2",
        folderId: input.folderId,
        originalName: input.originalName,
        normalizedName: input.normalizedName,
        extension: input.extension,
        mediaType: input.mediaType,
        relativePath: "pending",
        sizeBytes: input.sizeBytes,
        orderIndex: input.orderIndex,
        updatedAt: new Date("2026-04-24T12:00:00.000Z"),
      }));

    writeVideotecaFileStreamToDiskMock.mockResolvedValueOnce(undefined).mockRejectedValueOnce(streamFailure);

    updateFileStorageMock.mockImplementationOnce(async (_fileId: string, relativePath: string) => ({
      id: "file-1",
      folderId: "folder-1",
      originalName: "uno.mp4",
      normalizedName: "uno.mp4",
      extension: "mp4",
      mediaType: "video",
      relativePath,
      sizeBytes: 3,
      orderIndex: 1,
      updatedAt: new Date("2026-04-24T12:00:00.000Z"),
    }));

    await expect(
      videotecaService.uploadFiles(
        { id: "trainer-1", role: "TRAINER" },
        {
          folderId: "folder-1",
          files: [
            createUploadInput({ originalName: "uno.mp4", content: Buffer.from("abc") }),
            createUploadInput({ originalName: "dos.mp4", content: Buffer.from("def") }),
          ],
        }
      )
    ).rejects.toBe(streamFailure);

    expect(createFileMock).toHaveBeenCalledTimes(2);
    expect(updateFileStorageMock).toHaveBeenCalledTimes(1);
    expect(removeVideotecaFileFromDiskMock).toHaveBeenCalledTimes(1);
    expect(removeVideotecaFileFromDiskMock).toHaveBeenCalledWith("/tmp/folder-1/dos.mp4--file-2.mp4");
    expect(deleteFileByIdMock).toHaveBeenCalledTimes(2);
    expect(deleteFileByIdMock).toHaveBeenNthCalledWith(1, "file-1");
    expect(deleteFileByIdMock).toHaveBeenNthCalledWith(2, "file-2");
    expect(touchFolderMock).not.toHaveBeenCalled();
  });

  it("rolls back file on disk when updateFileStorage fails after successful write", async () => {
    // Scenario: createFile succeeds, write succeeds, but updateFileStorage fails
    // The service should still clean up the written file from disk
    fileTypeFromBufferMock.mockResolvedValue(undefined);

    const updateStorageFailure = new Error("database connection lost");

    createFileMock.mockImplementation(async (input: any) => ({
      id: "file-1",
      folderId: input.folderId,
      originalName: input.originalName,
      normalizedName: input.normalizedName,
      extension: input.extension,
      mediaType: input.mediaType,
      relativePath: "pending",
      sizeBytes: input.sizeBytes,
      orderIndex: input.orderIndex,
      updatedAt: new Date("2026-04-24T12:00:00.000Z"),
    }));

    writeVideotecaFileStreamToDiskMock.mockResolvedValue(undefined);
    updateFileStorageMock.mockRejectedValue(updateStorageFailure);

    await expect(
      videotecaService.uploadFiles(
        { id: "trainer-1", role: "TRAINER" },
        {
          folderId: "folder-1",
          files: [
            createUploadInput({ originalName: "video.mp4", content: Buffer.from("abc") }),
          ],
        }
      )
    ).rejects.toBe(updateStorageFailure);

    // createFile succeeded
    expect(createFileMock).toHaveBeenCalledTimes(1);

    // writeVideotecaFileStreamToDisk succeeded
    expect(writeVideotecaFileStreamToDiskMock).toHaveBeenCalledTimes(1);

    // updateFileStorage failed
    expect(updateFileStorageMock).toHaveBeenCalledTimes(1);

    // rollback: file on disk should be removed
    expect(removeVideotecaFileFromDiskMock).toHaveBeenCalledTimes(1);
    expect(removeVideotecaFileFromDiskMock).toHaveBeenCalledWith("/tmp/folder-1/video.mp4--file-1.mp4");

    // rollback: DB row should be deleted
    expect(deleteFileByIdMock).toHaveBeenCalledTimes(1);
    expect(deleteFileByIdMock).toHaveBeenCalledWith("file-1");

    // touchFolder should NOT be called (error bubbled up)
    expect(touchFolderMock).not.toHaveBeenCalled();
  });
});
