import { fileTypeFromBuffer } from "file-type";

import { requireRole, type AuthenticatedUser } from "@/features/auth/authorization";
import { videotecaRepository } from "@/features/videoteca/repository";
import {
  buildVideotecaRelativePath,
  buildVideotecaStorageFileName,
  ensureVideotecaFolderDirectory,
  getVideotecaAbsolutePath,
  removeVideotecaFolderDirectory,
  removeVideotecaFileFromDisk,
  VideotecaStorageSizeError,
  writeVideotecaFileStreamToDisk,
} from "@/features/videoteca/storage";
import { ApiError } from "@/lib/http/api-response";
import {
  extractVideotecaExtension,
  getVideotecaMaxSizeByType,
  getVideotecaMediaType,
  isVideotecaMimeCompatibleWithMediaType,
  isAllowedVideotecaExtension,
  type VideotecaFileType,
} from "@/lib/validation/videoteca";

type UploadVideotecaFileInput = {
  originalName: string;
  sizeBytes: number;
  declaredMimeType?: string | null;
  openStream: () => ReadableStream<Uint8Array>;
};

type UploadVideotecaBatchInput = {
  folderId: string;
  files: UploadVideotecaFileInput[];
};

type VideotecaFileDTO = {
  id: string;
  folderId: string;
  name: string;
  type: "image" | "video";
  extension: VideotecaFileType;
  duration: string;
  updatedAt: string;
  sizeBytes: number;
  orderIndex: number;
};

type VideotecaFolderDTO = {
  id: string;
  name: string;
  parentId: string | null;
  updatedAt: string;
  fileCount: number;
  tags: string[];
  parent: VideotecaFolderParentSummaryDTO | null;
  childFolders: VideotecaFolderSummaryDTO[];
  files: VideotecaFileDTO[];
};

type VideotecaFolderSummaryDTO = {
  id: string;
  name: string;
  parentId: string | null;
  updatedAt: string;
  fileCount: number;
  tags: string[];
};

type VideotecaFolderParentSummaryDTO = {
  id: string;
  name: string;
};

const formatDateEsAr = (value: Date) => {
  return value.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeFileNameForDuplicateCheck = (fileName: string) => fileName.trim().toLowerCase();
const normalizeFolderName = (folderName: string) => folderName.trim().replace(/\s+/g, " ");
const FILE_SIGNATURE_SAMPLE_BYTES = 4_100;

const parseStoredMediaType = (mediaType: string): "image" | "video" => {
  if (mediaType === "image" || mediaType === "video") {
    return mediaType;
  }

  throw new ApiError("Tipo de archivo de videoteca inválido", 500, "INTERNAL_ERROR");
};

const isDuplicateNameConstraintError = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const prismaCode = Reflect.get(error, "code");

  if (prismaCode !== "P2002") {
    return false;
  }

  const meta = Reflect.get(error, "meta");

  if (typeof meta !== "object" || meta === null) {
    return false;
  }

  const target = Reflect.get(meta, "target");

  if (!Array.isArray(target)) {
    return false;
  }

  return target.includes("folderId") && target.includes("normalizedName");
};

const isPrismaNotFoundError = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return Reflect.get(error, "code") === "P2025";
};

const parseAllowedExtension = (fileName: string): VideotecaFileType => {
  const extension = extractVideotecaExtension(fileName);

  if (!extension || !isAllowedVideotecaExtension(extension)) {
    throw new ApiError(
      "Tipo de archivo no soportado. Solo se permiten jpg, jpeg, png, webp, mp4, mov y webm",
      400,
      "VALIDATION_ERROR"
    );
  }

  return extension;
};

const areEquivalentVideotecaExtensions = (extension: VideotecaFileType, detectedExtension: string) => {
  if (extension === detectedExtension) {
    return true;
  }

  return extension === "jpeg" && detectedExtension === "jpg";
};

const readFileSignatureSample = async (file: UploadVideotecaFileInput): Promise<Buffer | null> => {
  const sampleSize = Math.min(FILE_SIGNATURE_SAMPLE_BYTES, file.sizeBytes);

  if (sampleSize <= 0) {
    return null;
  }

  const reader = file.openStream().getReader();
  const chunks: Buffer[] = [];
  let collectedBytes = 0;

  try {
    while (collectedBytes < sampleSize) {
      const { done, value } = await reader.read();

      if (done || !value) {
        break;
      }

      const remainingBytes = sampleSize - collectedBytes;
      const chunk = value.byteLength > remainingBytes ? value.subarray(0, remainingBytes) : value;

      chunks.push(Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength));
      collectedBytes += chunk.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  if (chunks.length === 0) {
    return null;
  }

  return Buffer.concat(chunks, collectedBytes);
};

const validateFileInput = async (file: UploadVideotecaFileInput) => {
  if (file.sizeBytes <= 0) {
    throw new ApiError("El archivo no puede estar vacío", 400, "VALIDATION_ERROR");
  }

  const extension = parseAllowedExtension(file.originalName);
  const mediaType = getVideotecaMediaType(extension);
  const maxSizeBytes = getVideotecaMaxSizeByType(mediaType);

  if (file.sizeBytes > maxSizeBytes) {
    throw new ApiError(
      mediaType === "image"
        ? "La imagen supera el tamaño máximo de 10 MB"
        : "El video supera el tamaño máximo de 200 MB",
      400,
      "VALIDATION_ERROR"
    );
  }

  const signatureSample = await readFileSignatureSample(file);
  const detectedFileType = signatureSample ? await fileTypeFromBuffer(signatureSample) : undefined;

  if (detectedFileType) {
    if (!isAllowedVideotecaExtension(detectedFileType.ext)) {
      throw new ApiError(
        "Tipo de archivo no soportado. Solo se permiten jpg, jpeg, png, webp, mp4, mov y webm",
        400,
        "VALIDATION_ERROR"
      );
    }

    if (!areEquivalentVideotecaExtensions(extension, detectedFileType.ext)) {
      throw new ApiError("La extensión del archivo no coincide con su contenido real", 400, "VALIDATION_ERROR");
    }

    if (!isVideotecaMimeCompatibleWithMediaType(detectedFileType.mime, mediaType)) {
      throw new ApiError("El contenido detectado no corresponde al tipo de archivo permitido", 400, "VALIDATION_ERROR");
    }
  }

  return {
    extension,
    mediaType,
    sizeBytes: file.sizeBytes,
    maxSizeBytes,
    normalizedName: normalizeFileNameForDuplicateCheck(file.originalName),
  };
};

const mapVideotecaFile = (file: {
  id: string;
  folderId: string;
  originalName: string;
  mediaType: string;
  extension: string;
  sizeBytes: number;
  orderIndex: number;
  updatedAt: Date;
}): VideotecaFileDTO => ({
  id: file.id,
  folderId: file.folderId,
  name: file.originalName,
  type: parseStoredMediaType(file.mediaType),
  extension: file.extension as VideotecaFileType,
  duration: "—",
  updatedAt: formatDateEsAr(file.updatedAt),
  sizeBytes: file.sizeBytes,
  orderIndex: file.orderIndex,
});

const mapVideotecaFolder = (folder: {
  id: string;
  name: string;
  parentId: string | null;
  updatedAt: Date;
  parent: {
    id: string;
    name: string;
  } | null;
  children: Array<{
    id: string;
    name: string;
    parentId: string | null;
    updatedAt: Date;
    _count: {
      files: number;
    };
  }>;
  files: Array<{
    id: string;
    folderId: string;
    originalName: string;
    mediaType: string;
    extension: string;
    sizeBytes: number;
    orderIndex: number;
    updatedAt: Date;
  }>;
}): VideotecaFolderDTO => ({
  id: folder.id,
  name: folder.name,
  parentId: folder.parentId,
  updatedAt: formatDateEsAr(folder.updatedAt),
  fileCount: folder.files.length,
  tags: [],
  parent: folder.parent ? { id: folder.parent.id, name: folder.parent.name } : null,
  childFolders: folder.children.map(mapVideotecaFolderSummary),
  files: folder.files.map(mapVideotecaFile),
});

const mapVideotecaFolderSummary = (folder: {
  id: string;
  name: string;
  parentId: string | null;
  updatedAt: Date;
  _count: {
    files: number;
  };
}): VideotecaFolderSummaryDTO => ({
  id: folder.id,
  name: folder.name,
  parentId: folder.parentId,
  updatedAt: formatDateEsAr(folder.updatedAt),
  fileCount: folder._count.files,
  tags: [],
});

export class VideotecaService {
  async listFolders(_actor: AuthenticatedUser) {
    const folders = await videotecaRepository.listFolders();
    return folders.map(mapVideotecaFolderSummary);
  }

  async createFolder(actor: AuthenticatedUser, input: { name: string; parentId?: string | null }) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden crear carpetas de videoteca");

    const name = normalizeFolderName(input.name);
    const parentId = input.parentId?.trim() ? input.parentId.trim() : null;

    if (!name) {
      throw new ApiError("El nombre de la carpeta es obligatorio", 400, "VALIDATION_ERROR");
    }

    if (parentId) {
      const parentFolder = await videotecaRepository.findFolderSummaryById(parentId);

      if (!parentFolder) {
        throw new ApiError("La carpeta padre no existe", 404, "NOT_FOUND");
      }
    }

    const folder = await videotecaRepository.createFolder(name, parentId);
    return mapVideotecaFolderSummary(folder);
  }

  async renameFolder(actor: AuthenticatedUser, folderId: string, input: { name: string }) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden editar carpetas de videoteca");

    const name = normalizeFolderName(input.name);

    if (!name) {
      throw new ApiError("El nombre de la carpeta es obligatorio", 400, "VALIDATION_ERROR");
    }

    const folder = await videotecaRepository.renameFolder(folderId, name).catch((error: unknown) => {
      if (isPrismaNotFoundError(error)) {
        throw new ApiError("Carpeta de videoteca no encontrada", 404, "NOT_FOUND");
      }

      throw error;
    });

    return mapVideotecaFolderSummary(folder);
  }

  async deleteFolder(actor: AuthenticatedUser, folderId: string) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden eliminar carpetas de videoteca");

    const folder = await videotecaRepository.findFolderById(folderId);

    if (!folder) {
      throw new ApiError("Carpeta de videoteca no encontrada", 404, "NOT_FOUND");
    }

    if (folder.files.length > 0) {
      throw new ApiError(
        "No se puede eliminar una carpeta que todavía tiene archivos",
        409,
        "CONFLICT"
      );
    }

    if (folder.children.length > 0) {
      throw new ApiError(
        "No se puede eliminar una carpeta que todavía tiene subcarpetas",
        409,
        "CONFLICT"
      );
    }

    const deletedFolder = await videotecaRepository.deleteFolder(folderId);
    await removeVideotecaFolderDirectory(folderId).catch(() => null);

    return mapVideotecaFolderSummary(deletedFolder);
  }

  async getFolderDetail(_actor: AuthenticatedUser, folderId: string) {
    const folder = await videotecaRepository.findFolderById(folderId);

    if (!folder) {
      throw new ApiError("Carpeta de videoteca no encontrada", 404, "NOT_FOUND");
    }

    return mapVideotecaFolder(folder);
  }

  async uploadFiles(actor: AuthenticatedUser, input: UploadVideotecaBatchInput) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden subir archivos a videoteca");

    if (input.files.length === 0) {
      throw new ApiError("Debés seleccionar al menos un archivo", 400, "VALIDATION_ERROR");
    }

    const folder = await videotecaRepository.findFolderById(input.folderId);

    if (!folder) {
      throw new ApiError("Carpeta de videoteca no encontrada", 404, "NOT_FOUND");
    }

    const createdRecords: Array<{ id: string; relativePath: string | null; absolutePath: string }> = [];
    const uploadedFiles: VideotecaFileDTO[] = [];
    let nextOrderIndex = await videotecaRepository.getNextOrderIndex(folder.id);

    await ensureVideotecaFolderDirectory(folder.id);

    try {
      for (const file of input.files) {
        const parsed = await validateFileInput(file);

        const createdFile = await videotecaRepository
          .createFile({
            folderId: folder.id,
            originalName: file.originalName,
            normalizedName: parsed.normalizedName,
            extension: parsed.extension,
            mediaType: parsed.mediaType,
            relativePath: "pending",
            sizeBytes: parsed.sizeBytes,
            orderIndex: nextOrderIndex,
          })
          .catch((error: unknown) => {
            if (isDuplicateNameConstraintError(error)) {
              throw new ApiError(
                "Ya existe un archivo con ese nombre dentro de esta carpeta",
                409,
                "CONFLICT"
              );
            }

            throw error;
          });

        nextOrderIndex += 1;

        const storageFileName = buildVideotecaStorageFileName({
          originalName: file.originalName,
          fileId: createdFile.id,
          type: parsed.extension,
        });

        const relativePath = buildVideotecaRelativePath(folder.id, storageFileName);
        const absolutePath = getVideotecaAbsolutePath(relativePath);

        // Push record with paths upfront so rollback can clean up on failure
        createdRecords.push({ id: createdFile.id, relativePath: null, absolutePath });

        try {
          await writeVideotecaFileStreamToDisk(absolutePath, file.openStream(), {
            expectedSizeBytes: parsed.sizeBytes,
            maxSizeBytes: parsed.maxSizeBytes,
          });
        } catch (error) {
          if (error instanceof VideotecaStorageSizeError) {
            const maxSizeErrorMessage =
              parsed.mediaType === "image"
                ? "La imagen supera el tamaño máximo de 10 MB"
                : "El video supera el tamaño máximo de 200 MB";

            if (error.message.includes("máximo")) {
              throw new ApiError(maxSizeErrorMessage, 400, "VALIDATION_ERROR");
            }

            throw new ApiError("El archivo recibido está corrupto o incompleto", 400, "VALIDATION_ERROR");
          }

          throw error;
        }

        const persistedFile = await videotecaRepository.updateFileStorage(createdFile.id, relativePath);

        const currentRecord = createdRecords.find((record) => record.id === createdFile.id);
        if (currentRecord) {
          currentRecord.relativePath = relativePath;
        }

        uploadedFiles.push(mapVideotecaFile(persistedFile));
      }

      await videotecaRepository.touchFolder(folder.id);

      return uploadedFiles;
    } catch (error) {
      for (const record of createdRecords) {
        // Only clean up files that were written to disk but DB update failed (relativePath never set)
        if (record.absolutePath && !record.relativePath) {
          await removeVideotecaFileFromDisk(record.absolutePath).catch(() => null);
        }
        await videotecaRepository.deleteFileById(record.id).catch(() => null);
      }

      throw error;
    }
  }

  async renameFile(actor: AuthenticatedUser, fileId: string, input: { name: string }) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden editar archivos de videoteca");

    const file = await videotecaRepository.findFileById(fileId);

    if (!file) {
      throw new ApiError("Archivo de videoteca no encontrado", 404, "NOT_FOUND");
    }

    const nextName = input.name.trim().replace(/\s+/g, " ");

    if (!nextName) {
      throw new ApiError("El nombre del archivo es obligatorio", 400, "VALIDATION_ERROR");
    }

    const renamedFile = await videotecaRepository
      .updateFileMetadata(fileId, {
        originalName: nextName,
        normalizedName: normalizeFileNameForDuplicateCheck(nextName),
      })
      .catch((error: unknown) => {
        if (isDuplicateNameConstraintError(error)) {
          throw new ApiError(
            "Ya existe un archivo con ese nombre dentro de esta carpeta",
            409,
            "CONFLICT"
          );
        }

        if (isPrismaNotFoundError(error)) {
          throw new ApiError("Archivo de videoteca no encontrado", 404, "NOT_FOUND");
        }

        throw error;
      });

    await videotecaRepository.touchFolder(renamedFile.folderId);

    return mapVideotecaFile(renamedFile);
  }

  async deleteFile(actor: AuthenticatedUser, fileId: string) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden eliminar archivos de videoteca");

    const file = await videotecaRepository.findFileById(fileId);

    if (!file) {
      throw new ApiError("Archivo de videoteca no encontrado", 404, "NOT_FOUND");
    }

    await videotecaRepository.deleteFileById(fileId);

    const absolutePath = getVideotecaAbsolutePath(file.relativePath);
    await removeVideotecaFileFromDisk(absolutePath).catch(() => null);

    await videotecaRepository.touchFolder(file.folderId);

    return mapVideotecaFile(file);
  }

  async getFile(actor: AuthenticatedUser, fileId: string) {
    void actor;

    const file = await videotecaRepository.findFileById(fileId);

    if (!file) {
      throw new ApiError("Archivo de videoteca no encontrado", 404, "NOT_FOUND");
    }

    return {
      ...mapVideotecaFile(file),
      path: file.relativePath,
    };
  }
}

export const videotecaService = new VideotecaService();
