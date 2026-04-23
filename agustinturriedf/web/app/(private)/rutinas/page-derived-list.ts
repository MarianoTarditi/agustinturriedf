import type { RoutineFolderSummary } from "@/app/(private)/rutinas/runtime";

export type RoutineFolderSort = "recent" | "alphabetical" | "more-files";
export type RoutineFolderFilter = "all" | "with-files" | "without-files";

type DeriveRoutineFoldersParams = {
  query: string;
  sortBy: RoutineFolderSort;
  filterBy: RoutineFolderFilter;
};

const normalizeQuery = (value: string) => value.trim().toLocaleLowerCase("es");

export const deriveRoutineFolders = (
  folders: RoutineFolderSummary[],
  params: DeriveRoutineFoldersParams,
): RoutineFolderSummary[] => {
  const normalizedQuery = normalizeQuery(params.query);
  const indexedFolders = folders
    .map((folder, index) => ({ folder, index }))
    .filter(({ folder }) => {
      if (normalizedQuery.length > 0) {
        const searchableValues = [folder.firstName, folder.lastName, folder.email]
          .map((token) => token.trim().toLocaleLowerCase("es"))
          .filter(Boolean);

        const matchesQuery = searchableValues.some((token) => token.includes(normalizedQuery));

        if (!matchesQuery) {
          return false;
        }
      }

      if (params.filterBy === "with-files") {
        return folder.fileCount > 0;
      }

      if (params.filterBy === "without-files") {
        return folder.fileCount === 0;
      }

      return true;
    });

  indexedFolders.sort((left, right) => {
    if (params.sortBy === "alphabetical") {
      const byName = left.folder.displayName.localeCompare(right.folder.displayName, "es", {
        sensitivity: "base",
      });

      if (byName !== 0) return byName;
    }

    if (params.sortBy === "more-files") {
      const byFileCount = right.folder.fileCount - left.folder.fileCount;
      if (byFileCount !== 0) return byFileCount;
    }

    return left.index - right.index;
  });

  return indexedFolders.map(({ folder }) => folder);
};
