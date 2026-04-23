import { requireRole, type AuthenticatedUser } from "@/features/auth/authorization";
import { videotecaRepository } from "@/features/videoteca/repository";
import {
  buildVideotecaRelativePath,
  buildVideotecaStorageFileName,
  ensureVideotecaFolderDirectory,
  getVideotecaAbsolutePath,
  removeVideotecaFileFromDisk,
  writeVideotecaFileToDisk,
} from "@/features/videoteca/storage";
import { ApiError } from "@/lib/http/api-response";
import {
  extractVideotecaExtension,
  getVideotecaMaxSizeByType,
  getVideotecaMediaType,
  isAllowedVideotecaExtension,
  type VideotecaFileType,
} from "@/lib/validation/videoteca";

type UploadVideotecaFileInput = {
  originalName: string;
  sizeBytes: number;
  content: Buffer;
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
  updatedAt: string;
  fileCount: number;
  tags: string[];
  files: VideotecaFileDTO[];
};

const formatDateEsAr = (value: Date) => {
  return value.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeFileNameForDuplicateCheck = (fileName: string) => fileName.trim().toLowerCase();

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

const validateFileInput = (file: UploadVideotecaFileInput) => {
  const detectedSizeBytes = file.content.length;

  if (detectedSizeBytes === 0 || file.sizeBytes <= 0) {
    throw new ApiError("El archivo no puede estar vacío", 400, "VALIDATION_ERROR");
  }

  const extension = parseAllowedExtension(file.originalName);
  const mediaType = getVideotecaMediaType(extension);
  const maxSizeBytes = getVideotecaMaxSizeByType(mediaType);

  if (detectedSizeBytes > maxSizeBytes) {
    throw new ApiError(
      mediaType === "image"
        ? "La imagen supera el tamaño máximo de 10 MB"
        : "El video supera el tamaño máximo de 200 MB",
      400,
      "VALIDATION_ERROR"
    );
  }

  return {
    extension,
    mediaType,
    sizeBytes: detectedSizeBytes,
    normalizedName: normalizeFileNameForDuplicateCheck(file.originalName),
  };
};

const mapVideotecaFile = (file: {
  id: string;
  folderId: string;
  originalName: string;
  mediaType: "image" | "video";
  extension: string;
  sizeBytes: number;
  orderIndex: number;
  updatedAt: Date;
}): VideotecaFileDTO => ({
  id: file.id,
  folderId: file.folderId,
  name: file.originalName,
  type: file.mediaType,
  extension: file.extension as VideotecaFileType,
  duration: "—",
  updatedAt: formatDateEsAr(file.updatedAt),
  sizeBytes: file.sizeBytes,
  orderIndex: file.orderIndex,
});

const mapVideotecaFolder = (folder: {
  id: string;
  name: string;
  updatedAt: Date;
  files: Array<{
    id: string;
    folderId: string;
    originalName: string;
    mediaType: "image" | "video";
    extension: string;
    sizeBytes: number;
    orderIndex: number;
    updatedAt: Date;
  }>;
}): VideotecaFolderDTO => ({
  id: folder.id,
  name: folder.name,
  updatedAt: formatDateEsAr(folder.updatedAt),
  fileCount: folder.files.length,
  tags: [],
  files: folder.files.map(mapVideotecaFile),
});

export class VideotecaService {
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

    const validatedFiles = input.files.map((file) => ({
      file,
      parsed: validateFileInput(file),
    }));

    const createdRecords: Array<{ id: string; relativePath: string | null }> = [];
    const uploadedFiles: VideotecaFileDTO[] = [];
    let nextOrderIndex = await videotecaRepository.getNextOrderIndex(folder.id);

    try {
      for (const entry of validatedFiles) {
        const createdFile = await videotecaRepository
          .createFile({
            folderId: folder.id,
            originalName: entry.file.originalName,
            normalizedName: entry.parsed.normalizedName,
            extension: entry.parsed.extension,
            mediaType: entry.parsed.mediaType,
            relativePath: "pending",
            sizeBytes: entry.parsed.sizeBytes,
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
        createdRecords.push({ id: createdFile.id, relativePath: null });

        const storageFileName = buildVideotecaStorageFileName({
          originalName: entry.file.originalName,
          fileId: createdFile.id,
          type: entry.parsed.extension,
        });

        const relativePath = buildVideotecaRelativePath(folder.id, storageFileName);
        const absolutePath = getVideotecaAbsolutePath(relativePath);

        await ensureVideotecaFolderDirectory(folder.id);
        await writeVideotecaFileToDisk(absolutePath, entry.file.content);

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
        if (record.relativePath) {
          await removeVideotecaFileFromDisk(getVideotecaAbsolutePath(record.relativePath)).catch(() => null);
        }
        await videotecaRepository.deleteFileById(record.id).catch(() => null);
      }

      throw error;
    }
  }
}

export const videotecaService = new VideotecaService();
