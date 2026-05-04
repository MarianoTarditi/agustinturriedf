export const VIDEOTECA_PAGE_SIZE = 7;

export type VideotecaPage = {
  currentPage: number;
  totalPages: number;
  visibleFolders: string[];
};

export const getVideotecaTotalPages = (totalFolders: number, pageSize = VIDEOTECA_PAGE_SIZE) =>
  Math.max(1, Math.ceil(totalFolders / pageSize));

export const clampVideotecaPage = (requestedPage: number, totalPages: number) => {
  if (!Number.isFinite(requestedPage)) return 1;
  if (requestedPage < 1) return 1;
  if (requestedPage > totalPages) return totalPages;
  return Math.floor(requestedPage);
};

export const getVideotecaPage = (
  folderIds: string[],
  requestedPage: number,
  pageSize = VIDEOTECA_PAGE_SIZE
): VideotecaPage => {
  const totalPages = getVideotecaTotalPages(folderIds.length, pageSize);
  const currentPage = clampVideotecaPage(requestedPage, totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  return {
    currentPage,
    totalPages,
    visibleFolders: folderIds.slice(startIndex, startIndex + pageSize),
  };
};
