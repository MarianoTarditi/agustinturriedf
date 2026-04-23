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

const allowedExtensionSet = new Set<string>(VIDEOTECA_ALLOWED_EXTENSIONS);
const imageExtensionSet = new Set<string>(VIDEOTECA_ALLOWED_IMAGE_EXTENSIONS);
const videoExtensionSet = new Set<string>(VIDEOTECA_ALLOWED_VIDEO_EXTENSIONS);

export const videotecaFileTypeSchema = z.enum(VIDEOTECA_ALLOWED_EXTENSIONS);
export type VideotecaFileType = z.infer<typeof videotecaFileTypeSchema>;

export type VideotecaMediaType = "image" | "video";

export const videotecaFolderIdParamSchema = z.object({
  folderId: requiredStringSchema.max(255),
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
