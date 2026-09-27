import type { RoutineFile } from "@/app/(private)/rutinas/runtime";

/**
 * Filter routine files by name or type using locale-aware case-insensitive matching.
 * Empty or whitespace-only queries return the full list unchanged.
 */
export const filterRoutineFiles = (files: RoutineFile[], query: string): RoutineFile[] => {
  const normalized = query.trim().toLocaleLowerCase("es");
  if (!normalized) return files;

  return files.filter(
    (file) =>
      file.name.toLocaleLowerCase("es").includes(normalized) ||
      file.type.toLocaleLowerCase("es").includes(normalized),
  );
};