import { hasRole, requireRole, type AuthenticatedUser } from "@/features/auth/authorization";
import { routinesRepository } from "@/features/routines/repository";
import {
  buildRoutineRelativePath,
  buildRoutineStorageFileName,
  ensureStudentRoutineDirectory,
  getRoutineAbsolutePath,
  removeRoutineFileFromDisk,
  writeRoutineFileToDisk,
} from "@/features/routines/storage";
import { ApiError } from "@/lib/http/api-response";
import {
  extractRoutineFileExtension,
  isAllowedRoutineFileType,
  routineObservationsSchema,
  type RoutineFileType,
} from "@/lib/validation/routines";

type RoutineFileDTO = {
  id: string;
  name: string;
  type: RoutineFileType;
  path: string;
  uploadedAt: Date;
  sizeBytes: number;
  observations: string | null;
};

type RoutineFolderDTO = {
  id: string;
  studentProfileId: string;
  studentUserId: string;
  displayName: string;
  storageKey: string;
  files: RoutineFileDTO[];
};

type UploadRoutineFileInput = {
  folderId: string;
  originalName: string;
  sizeBytes: number;
  content: Buffer;
  observations?: string | null;
};

const mapRoutineFile = (file: {
  id: string;
  originalName: string;
  extension: string;
  relativePath: string;
  uploadedAt: Date;
  sizeBytes: number;
  observations?: string | null;
}): RoutineFileDTO => ({
  id: file.id,
  name: file.originalName,
  type: file.extension as RoutineFileType,
  path: file.relativePath,
  uploadedAt: file.uploadedAt,
  sizeBytes: file.sizeBytes,
  observations: file.observations ?? null,
});

const mapRoutineFolder = (folder: {
  id: string;
  studentProfileId: string;
  displayName: string;
  storageKey: string;
  studentProfile: {
    userId: string;
  };
  files: Array<{
    id: string;
    originalName: string;
    extension: string;
    relativePath: string;
    uploadedAt: Date;
    sizeBytes: number;
    observations?: string | null;
  }>;
}): RoutineFolderDTO => ({
  id: folder.id,
  studentProfileId: folder.studentProfileId,
  studentUserId: folder.studentProfile.userId,
  displayName: folder.displayName,
  storageKey: folder.storageKey,
  files: folder.files.map(mapRoutineFile),
});

const ensureStudentReadAccess = (actor: AuthenticatedUser, ownerUserId: string) => {
  if (hasRole(actor, ["STUDENT"]) && actor.id !== ownerUserId) {
    throw new ApiError("No tenés permisos para acceder a rutinas de otro estudiante", 403, "FORBIDDEN");
  }
};

const parseAllowedExtension = (fileName: string): RoutineFileType => {
  const extension = extractRoutineFileExtension(fileName);

  if (!extension || !isAllowedRoutineFileType(extension)) {
    throw new ApiError("Tipo de archivo no soportado. Solo se permiten pdf, xls y xlsx", 400, "VALIDATION_ERROR");
  }

  return extension;
};

const normalizeObservations = (value: string | null | undefined) => {
  return routineObservationsSchema.parse(value ?? null) ?? null;
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

export class RoutinesService {
  async listFolders(actor: AuthenticatedUser) {
    if (hasRole(actor, ["STUDENT"])) {
      const ownFolder = await routinesRepository.findFolderByStudentUserId(actor.id);

      if (!ownFolder) {
        return [];
      }

      return [mapRoutineFolder(ownFolder)];
    }

    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden gestionar rutinas");

    const folders = await routinesRepository.listFoldersWithOwnership();
    return folders.map(mapRoutineFolder);
  }

  async listFolderFiles(actor: AuthenticatedUser, folderId: string) {
    const folder = await routinesRepository.findFolderWithOwnershipById(folderId);

    if (!folder) {
      throw new ApiError("Carpeta de rutinas no encontrada", 404, "NOT_FOUND");
    }

    if (!hasRole(actor, ["ADMIN", "TRAINER"])) {
      ensureStudentReadAccess(actor, folder.studentProfile.userId);
    }

    return mapRoutineFolder(folder);
  }

  async listOwnFolder(actor: AuthenticatedUser) {
    requireRole(actor, ["STUDENT"], "Solo STUDENT puede consultar su carpeta personal");

    const ownFolder = await routinesRepository.findFolderByStudentUserId(actor.id);

    if (!ownFolder) {
      throw new ApiError("Carpeta de rutinas no encontrada", 404, "NOT_FOUND");
    }

    return mapRoutineFolder(ownFolder);
  }

  async uploadFile(actor: AuthenticatedUser, input: UploadRoutineFileInput) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden subir rutinas");

    const detectedSizeBytes = input.content.length;

    if (detectedSizeBytes === 0 || input.sizeBytes <= 0) {
      throw new ApiError("El archivo no puede estar vacío", 400, "VALIDATION_ERROR");
    }

    const folder = await routinesRepository.findFolderWithOwnershipById(input.folderId);

    if (!folder) {
      throw new ApiError("Carpeta de rutinas no encontrada", 404, "NOT_FOUND");
    }

    const extension = parseAllowedExtension(input.originalName);
    const observations = normalizeObservations(input.observations);
    const normalizedName = normalizeFileNameForDuplicateCheck(input.originalName);

    const createdFile = await routinesRepository
      .createFile({
        folderId: folder.id,
        originalName: input.originalName,
        normalizedName,
        extension,
        relativePath: "pending",
        sizeBytes: detectedSizeBytes,
        observations,
      })
      .catch((error: unknown) => {
        if (isDuplicateNameConstraintError(error)) {
          throw new ApiError(
            "Ya existe un archivo con ese nombre en la carpeta del estudiante",
            409,
            "CONFLICT"
          );
        }

        throw error;
      });

    const storageFileName = buildRoutineStorageFileName({
      originalName: input.originalName,
      fileId: createdFile.id,
      type: extension,
    });

    const relativePath = buildRoutineRelativePath(folder.studentProfileId, storageFileName);
    const absolutePath = getRoutineAbsolutePath(relativePath);

    try {
      await ensureStudentRoutineDirectory(folder.studentProfileId);
      await writeRoutineFileToDisk(absolutePath, input.content);

      const persisted = await routinesRepository.updateFileStorage(createdFile.id, {
        relativePath,
        normalizedName,
      });

      return mapRoutineFile(persisted);
    } catch (error) {
      await routinesRepository.deleteFileById(createdFile.id).catch(() => null);
      throw error;
    }
  }

  async deleteFile(actor: AuthenticatedUser, fileId: string) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden eliminar rutinas");

    const file = await routinesRepository.findFileById(fileId);

    if (!file) {
      throw new ApiError("Archivo de rutina no encontrado", 404, "NOT_FOUND");
    }

    await routinesRepository.deleteFileById(fileId);

    const absolutePath = getRoutineAbsolutePath(file.relativePath);
    await removeRoutineFileFromDisk(absolutePath).catch(() => null);

    return mapRoutineFile(file);
  }

  async getFile(actor: AuthenticatedUser, fileId: string) {
    const file = await routinesRepository.findFileWithOwnershipById(fileId);

    if (!file) {
      throw new ApiError("Archivo de rutina no encontrado", 404, "NOT_FOUND");
    }

    if (!hasRole(actor, ["ADMIN", "TRAINER"])) {
      ensureStudentReadAccess(actor, file.folder.studentProfile.userId);
    }

    return mapRoutineFile(file);
  }
}

export const routinesService = new RoutinesService();
