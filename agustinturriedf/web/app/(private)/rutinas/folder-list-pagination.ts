import type { RoutineFolderSummary } from "@/app/(private)/rutinas/runtime";

export const ROUTINE_FOLDERS_LIST_PAGE_SIZE = 4;

export type RoutineFolderListPage = {
  currentPage: number;
  totalPages: number;
  visibleFolders: RoutineFolderSummary[];
};

export const getRoutineFoldersListTotalPages = (
  totalFolders: number,
  pageSize = ROUTINE_FOLDERS_LIST_PAGE_SIZE
) => Math.max(1, Math.ceil(totalFolders / pageSize));

export const clampRoutineFoldersListPage = (requestedPage: number, totalPages: number) => {
  if (!Number.isFinite(requestedPage)) return 1;
  if (requestedPage < 1) return 1;
  if (requestedPage > totalPages) return totalPages;
  return Math.floor(requestedPage);
};

export const getRoutineFoldersListPage = (
  folders: RoutineFolderSummary[],
  requestedPage: number,
  pageSize = ROUTINE_FOLDERS_LIST_PAGE_SIZE
): RoutineFolderListPage => {
  const totalPages = getRoutineFoldersListTotalPages(folders.length, pageSize);
  const currentPage = clampRoutineFoldersListPage(requestedPage, totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  return {
    currentPage,
    totalPages,
    visibleFolders: folders.slice(startIndex, startIndex + pageSize),
  };
};
