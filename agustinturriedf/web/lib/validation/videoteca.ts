import { z } from "zod";

import { requiredStringSchema } from "@/lib/validation/common";

export const VIDEOTECA_ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
export const VIDEOTECA_ALLOWED_VIDEO_EXTENSIONS = ["mp4", "mov", "webm"] as const;
export const VIDEOTECA_ALLOWED_EXTENSIONS = [
  ...VIDEOTECA_ALLOWED_IMAGE_EXTENSIONS,
  ...VIDEOTECA_ALLOWED_VIDEO_EXTENSIONS,
] as const;

export const VIDEOTECA_IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const VIDEOTECA_VIDEO_MAX_SIZE_BYTES = 200 * 1024 * 1024;
export const VIDEOTECA_ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const VIDEOTECA_ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
export const VIDEOTECA_ALLOWED_MIME_TYPES = [
  ...VIDEOTECA_ALLOWED_IMAGE_MIME_TYPES,
  ...VIDEOTECA_ALLOWED_VIDEO_MIME_TYPES,
] as const;

const allowedExtensionSet = new Set<string>(VIDEOTECA_ALLOWED_EXTENSIONS);
const imageExtensionSet = new Set<string>(VIDEOTECA_ALLOWED_IMAGE_EXTENSIONS);
const videoExtensionSet = new Set<string>(VIDEOTECA_ALLOWED_VIDEO_EXTENSIONS);
const allowedMimeTypeSet = new Set<string>(VIDEOTECA_ALLOWED_MIME_TYPES);
const imageMimeTypeSet = new Set<string>(VIDEOTECA_ALLOWED_IMAGE_MIME_TYPES);
const videoMimeTypeSet = new Set<string>(VIDEOTECA_ALLOWED_VIDEO_MIME_TYPES);

export const videotecaFileTypeSchema = z.enum(VIDEOTECA_ALLOWED_EXTENSIONS);
export type VideotecaFileType = z.infer<typeof videotecaFileTypeSchema>;

export type VideotecaMediaType = "image" | "video";

export const videotecaFolderIdParamSchema = z.object({
  folderId: requiredStringSchema.max(255),
});

export const videotecaFolderPayloadSchema = z.object({
  name: requiredStringSchema.max(120, "El nombre no puede superar los 120 caracteres"),
  parentId: requiredStringSchema.max(255).nullable().optional(),
});

export const videotecaFileIdParamSchema = z.object({
  fileId: requiredStringSchema.max(255),
});

export const videotecaFileRenamePayloadSchema = z.object({
  name: requiredStringSchema.max(255, "El nombre del archivo no puede superar los 255 caracteres"),
});

export const extractVideotecaExtension = (fileName: string): string | null => {
  const trimmed = fileName.trim();
  const lastDotIndex = trimmed.lastIndexOf(".");

  if (lastDotIndex <= 0 || lastDotIndex === trimmed.length - 1) {
    return null;
  }

  return trimmed.slice(lastDotIndex + 1).toLowerCase();
};

export const isAllowedVideotecaExtension = (value: string): value is VideotecaFileType => {
  return allowedExtensionSet.has(value.toLowerCase());
};

export const getVideotecaMediaType = (extension: VideotecaFileType): VideotecaMediaType => {
  if (imageExtensionSet.has(extension)) {
    return "image";
  }

  if (videoExtensionSet.has(extension)) {
    return "video";
  }

  throw new Error("Tipo de archivo de videoteca inválido");
};

export const getVideotecaMaxSizeByType = (mediaType: VideotecaMediaType) => {
  return mediaType === "image" ? VIDEOTECA_IMAGE_MAX_SIZE_BYTES : VIDEOTECA_VIDEO_MAX_SIZE_BYTES;
};

export const isAllowedVideotecaMimeType = (mimeType: string) => {
  return allowedMimeTypeSet.has(mimeType.toLowerCase());
};

export const isVideotecaMimeCompatibleWithMediaType = (mimeType: string, mediaType: VideotecaMediaType) => {
  const normalizedMimeType = mimeType.toLowerCase();

  return mediaType === "image"
    ? imageMimeTypeSet.has(normalizedMimeType)
    : videoMimeTypeSet.has(normalizedMimeType);
};
