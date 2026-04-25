import { createWriteStream } from "node:fs";
import { mkdir, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import type { VideotecaFileType } from "@/lib/validation/videoteca";

const VIDEOTECA_STORAGE_BASE_DIR = path.join(process.cwd(), "storage", "videoteca");

const collapseDashGroups = (value: string) => value.replace(/-+/g, "-");

export const sanitizeVideotecaFileBaseName = (fileName: string) => {
  const parsedName = path.parse(fileName).name;

  const sanitized = collapseDashGroups(
    parsedName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );

  return sanitized.length > 0 ? sanitized : "archivo";
};

export const getVideotecaFolderDirectory = (folderId: string) => {
  return path.join(VIDEOTECA_STORAGE_BASE_DIR, folderId);
};

export const ensureVideotecaFolderDirectory = async (folderId: string) => {
  const folderDirectory = getVideotecaFolderDirectory(folderId);
  await mkdir(folderDirectory, { recursive: true });
  return folderDirectory;
};

export const writeVideotecaFileToDisk = async (absolutePath: string, content: Buffer) => {
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content);
};

export class VideotecaStorageSizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VideotecaStorageSizeError";
  }
}

export const writeVideotecaFileStreamToDisk = async (
  absolutePath: string,
  contentStream: ReadableStream<Uint8Array>,
  options: {
    maxSizeBytes: number;
    expectedSizeBytes: number;
  }
) => {
  await mkdir(path.dirname(absolutePath), { recursive: true });

  let bytesWritten = 0;

  const sizeGuard = new Transform({
    transform(chunk, _encoding, callback) {
      const chunkSize = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk));
      bytesWritten += chunkSize;

      if (bytesWritten > options.maxSizeBytes) {
        callback(new VideotecaStorageSizeError("El archivo supera el tamaño máximo permitido"));
        return;
      }

      callback(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(contentStream as unknown as NodeReadableStream),
      sizeGuard,
      createWriteStream(absolutePath)
    );
  } catch (error) {
    await unlink(absolutePath).catch(() => null);
    throw error;
  }

  if (bytesWritten <= 0 || bytesWritten !== options.expectedSizeBytes) {
    await unlink(absolutePath).catch(() => null);
    throw new VideotecaStorageSizeError("El archivo recibido está corrupto o incompleto");
  }

  return bytesWritten;
};

export const removeVideotecaFileFromDisk = async (absolutePath: string) => {
  await unlink(absolutePath);
};

export const removeVideotecaFolderDirectory = async (folderId: string) => {
  await rm(getVideotecaFolderDirectory(folderId), {
    recursive: true,
    force: true,
  });
};

export const buildVideotecaStorageFileName = ({
  originalName,
  fileId,
  type,
}: {
  originalName: string;
  fileId: string;
  type: VideotecaFileType;
}) => {
  const safeBaseName = sanitizeVideotecaFileBaseName(originalName);
  return `${safeBaseName}--${fileId}.${type}`;
};

export const buildVideotecaRelativePath = (folderId: string, storageFileName: string) => {
  return path.posix.join(folderId, storageFileName);
};

export const getVideotecaAbsolutePath = (relativePath: string) => {
  const normalizedPath = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");

  if (normalizedPath.includes("..")) {
    throw new Error("Ruta de videoteca inválida");
  }

  return path.join(VIDEOTECA_STORAGE_BASE_DIR, ...normalizedPath.split("/"));
};

export { VIDEOTECA_STORAGE_BASE_DIR };
