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
  fileCount: number;
  files: RoutineFileDTO[];
};

type RoutineFolderSummaryDTO = {
  id: string;
  studentProfileId: string;
  studentUserId: string;
  displayName: string;
  storageKey: string;
  fileCount: number;
  firstName: string;
  lastName: string;
  email: string;
};

type UploadRoutineFileInput = {
  folderId: string;
  originalName: string;
  sizeBytes: number;
  content: Buffer;
  observations?: string | null;
  replaceFileId?: string | null;
};

type ExistingRoutineFile = {
  id: string;
  originalName: string;
  normalizedName: string;
  extension: string;
  relativePath: string;
  sizeBytes: number;
  observations?: string | null;
  uploadedAt: Date;
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
  fileCount: folder.files.length,
  files: folder.files.map(mapRoutineFile),
});

const mapRoutineFolderSummary = (folder: {
  id: string;
  studentProfileId: string;
  displayName: string;
  storageKey: string;
  studentProfile: {
    userId: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  _count: {
    files: number;
  };
}): RoutineFolderSummaryDTO => ({
  id: folder.id,
  studentProfileId: folder.studentProfileId,
  studentUserId: folder.studentProfile.userId,
  displayName: folder.displayName,
  storageKey: folder.storageKey,
  fileCount: folder._count.files,
  firstName: folder.studentProfile.user.firstName,
  lastName: folder.studentProfile.user.lastName,
  email: folder.studentProfile.user.email,
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

const mapAmbiguousCandidate = (file: {
  id: string;
  originalName: string;
  extension: string;
  uploadedAt: Date;
}) => ({
  id: file.id,
  name: file.originalName,
  type: file.extension as RoutineFileType,
  uploadedAt: file.uploadedAt,
});

const throwAmbiguousReplacement = (
  candidates: Array<{
    id: string;
    originalName: string;
    extension: string;
    uploadedAt: Date;
  }>
) => {
  throw new ApiError(
    "Se encontraron múltiples archivos candidatos para reemplazar. Seleccioná uno explícitamente.",
    409,
    "AMBIGUOUS_REPLACEMENT",
    {
      candidates: candidates.map(mapAmbiguousCandidate),
    }
  );
};

export class RoutinesService {
  async listFolders(actor: AuthenticatedUser) {
    if (hasRole(actor, ["STUDENT"])) {
      const ownFolder = await routinesRepository.findFolderByStudentUserId(actor.id);

      if (!ownFolder) {
        return [];
      }

      return [
        {
          id: ownFolder.id,
          studentProfileId: ownFolder.studentProfileId,
          studentUserId: ownFolder.studentProfile.userId,
          displayName: ownFolder.displayName,
          storageKey: ownFolder.storageKey,
          fileCount: ownFolder.files.length,
          firstName: ownFolder.studentProfile.user.firstName,
          lastName: ownFolder.studentProfile.user.lastName,
          email: ownFolder.studentProfile.user.email,
        },
      ];
    }

    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden gestionar rutinas");

    const folders = await routinesRepository.listFolderSummariesWithOwnership();
    return folders.map(mapRoutineFolderSummary);
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
    const existingFiles = folder.files as ExistingRoutineFile[];

    const selectedReplacementTarget =
      input.replaceFileId !== undefined && input.replaceFileId !== null
        ? existingFiles.find((file) => file.id === input.replaceFileId) ?? null
        : null;

    if (input.replaceFileId && !selectedReplacementTarget) {
      throw new ApiError("Archivo de reemplazo inválido para esta carpeta", 400, "VALIDATION_ERROR");
    }

    const replacementTarget = (() => {
      if (selectedReplacementTarget) {
        return selectedReplacementTarget;
      }

      const normalizedNameMatches = existingFiles.filter(
        (file) => normalizeFileNameForDuplicateCheck(file.originalName) === normalizedName
      );

      if (normalizedNameMatches.length > 1) {
        throwAmbiguousReplacement(normalizedNameMatches);
      }

      if (normalizedNameMatches.length === 1) {
        return normalizedNameMatches[0];
      }

      const sameTypeMatches = existingFiles.filter((file) => file.extension.toLowerCase() === extension);

      if (sameTypeMatches.length > 1) {
        throwAmbiguousReplacement(sameTypeMatches);
      }

      if (sameTypeMatches.length === 1) {
        return sameTypeMatches[0];
      }

      return null;
    })();

    if (replacementTarget) {
      const storageFileName = buildRoutineStorageFileName({
        originalName: input.originalName,
        fileId: replacementTarget.id,
        type: extension,
      });

      const relativePath = buildRoutineRelativePath(folder.studentProfileId, storageFileName);
      const absolutePath = getRoutineAbsolutePath(relativePath);
      const previousAbsolutePath = getRoutineAbsolutePath(replacementTarget.relativePath);

      await ensureStudentRoutineDirectory(folder.studentProfileId);
      await writeRoutineFileToDisk(absolutePath, input.content);

      if (previousAbsolutePath !== absolutePath) {
        await removeRoutineFileFromDisk(previousAbsolutePath).catch(() => null);
      }

      const replacedFile = await routinesRepository.updateFileMetadata(replacementTarget.id, {
        originalName: input.originalName,
        normalizedName,
        extension,
        relativePath,
        sizeBytes: detectedSizeBytes,
        observations,
        uploadedAt: new Date(),
      });

      return mapRoutineFile(replacedFile);
    }

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
