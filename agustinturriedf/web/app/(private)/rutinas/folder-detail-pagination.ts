import type { RoutineFile } from "@/app/(private)/rutinas/runtime";

export const ROUTINE_FILES_PAGE_SIZE = 5;

export type RoutineFilePage = {
  currentPage: number;
  totalPages: number;
  visibleFiles: RoutineFile[];
};

export const getRoutineFilesTotalPages = (totalFiles: number, pageSize = ROUTINE_FILES_PAGE_SIZE) =>
  Math.max(1, Math.ceil(totalFiles / pageSize));

export const clampRoutineFilesPage = (requestedPage: number, totalPages: number) => {
  if (!Number.isFinite(requestedPage)) return 1;
  if (requestedPage < 1) return 1;
  if (requestedPage > totalPages) return totalPages;
  return Math.floor(requestedPage);
};

export const getRoutineFilePage = (
  files: RoutineFile[],
  requestedPage: number,
  pageSize = ROUTINE_FILES_PAGE_SIZE
): RoutineFilePage => {
  const totalPages = getRoutineFilesTotalPages(files.length, pageSize);
  const currentPage = clampRoutineFilesPage(requestedPage, totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  return {
    currentPage,
    totalPages,
    visibleFiles: files.slice(startIndex, startIndex + pageSize),
  };
};
