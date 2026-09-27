import { access, constants, mkdir, rm, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { RoutineFileType } from "@/lib/validation/routines";
import { prisma } from "@/lib/prisma";

const ROUTINES_STORAGE_BASE_DIR = path.join(process.cwd(), "storage", "routines", "students");

const collapseDashGroups = (value: string) => value.replace(/-+/g, "-");

export const sanitizeRoutineFileBaseName = (fileName: string) => {
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

export const getStudentRoutineDirectory = (studentProfileId: string) => {
  return path.join(ROUTINES_STORAGE_BASE_DIR, studentProfileId);
};

export const ensureStudentRoutineDirectory = async (studentProfileId: string) => {
  const studentDirectory = getStudentRoutineDirectory(studentProfileId);
  const relative = path.relative(ROUTINES_STORAGE_BASE_DIR, studentDirectory);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Invalid routine directory");
  await mkdir(studentDirectory, { recursive: true });
  const details = await stat(studentDirectory);
  if (!details.isDirectory()) throw new Error("Invalid routine directory");
  if (typeof process.getuid === "function" && typeof details.uid === "number" && details.uid !== process.getuid()) throw new Error("Invalid routine directory");
  await access(studentDirectory, constants.R_OK | constants.W_OK);
  return studentDirectory;
};

export const persistRoutineProvisioning = async (studentProfileId: string, status: "READY" | "FAILED", transaction: any = prisma) => {
  const result = await (transaction as any).studentProfile.updateMany({ where: { id: studentProfileId, provisioningStatus: "PENDING" }, data: { provisioningStatus: status } });
  if (result.count !== 1) throw new Error("Provisioning state was not pending");
};

export const removeStudentRoutineDirectory = async (studentProfileId: string) => {
  const studentDirectory = getStudentRoutineDirectory(studentProfileId);
  await rm(studentDirectory, { recursive: true, force: true });
};

export const writeRoutineFileToDisk = async (absolutePath: string, content: Buffer) => {
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content);
};

export const removeRoutineFileFromDisk = async (absolutePath: string) => {
  await unlink(absolutePath);
};

export const buildRoutineStorageFileName = ({
  originalName,
  fileId,
  type,
}: {
  originalName: string;
  fileId: string;
  type: RoutineFileType;
}) => {
  const safeBaseName = sanitizeRoutineFileBaseName(originalName);
  return `${safeBaseName}--${fileId}.${type}`;
};

export const buildRoutineRelativePath = (studentProfileId: string, storageFileName: string) => {
  return path.posix.join(studentProfileId, storageFileName);
};

export const getRoutineAbsolutePath = (relativePath: string) => {
  const normalizedPath = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");

  if (normalizedPath.includes("..")) {
    throw new Error("Ruta de rutina inválida");
  }

  return path.join(ROUTINES_STORAGE_BASE_DIR, ...normalizedPath.split("/"));
};

export { ROUTINES_STORAGE_BASE_DIR };
