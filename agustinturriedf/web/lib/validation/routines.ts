import { z } from "zod";

import { cuidSchema, requiredStringSchema } from "@/lib/validation/common";

export const ROUTINE_ALLOWED_FILE_TYPES = ["pdf", "xls", "xlsx"] as const;

const routineAllowedFileTypeSet = new Set<string>(ROUTINE_ALLOWED_FILE_TYPES);

const normalizeNullableString = (value: unknown) => {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

export const routineFileTypeSchema = z.enum(ROUTINE_ALLOWED_FILE_TYPES);

export const routineFolderIdParamSchema = z.object({
  folderId: cuidSchema,
});

export const routineFileIdParamSchema = z.object({
  fileId: cuidSchema,
});

export const routineObservationsSchema = z.preprocess(
  normalizeNullableString,
  z.string().max(1000, "Las observaciones no pueden superar 1000 caracteres").nullable()
);

export const routineReplaceFileIdSchema = z.preprocess(normalizeNullableString, cuidSchema.nullable());

export const routineUploadPayloadSchema = z.object({
  originalName: requiredStringSchema.max(255, "El nombre del archivo no puede superar 255 caracteres"),
  extension: routineFileTypeSchema,
  sizeBytes: z
    .number()
    .int("El tamaño del archivo debe ser un entero")
    .nonnegative("El tamaño del archivo no puede ser negativo"),
  observations: routineObservationsSchema.optional(),
});

export const routineFileMetadataSchema = z.object({
  name: requiredStringSchema.max(255, "El nombre del archivo no puede superar 255 caracteres"),
  type: routineFileTypeSchema,
  path: requiredStringSchema,
  uploadedAt: z.coerce.date(),
  sizeBytes: z
    .number()
    .int("El tamaño del archivo debe ser un entero")
    .nonnegative("El tamaño del archivo no puede ser negativo"),
  observations: routineObservationsSchema,
});

export const extractRoutineFileExtension = (fileName: string): string | null => {
  const trimmed = fileName.trim();
  const lastDotIndex = trimmed.lastIndexOf(".");

  if (lastDotIndex <= 0 || lastDotIndex === trimmed.length - 1) {
    return null;
  }

  return trimmed.slice(lastDotIndex + 1).toLowerCase();
};

export const isAllowedRoutineFileType = (value: string): value is RoutineFileType => {
  return routineAllowedFileTypeSet.has(value.toLowerCase());
};

export type RoutineFileType = z.infer<typeof routineFileTypeSchema>;
export type RoutineUploadPayload = z.infer<typeof routineUploadPayloadSchema>;
export type RoutineFileMetadata = z.infer<typeof routineFileMetadataSchema>;
