import { describe, expect, it } from "vitest";

import {
  ROUTINE_FOLDERS_LIST_PAGE_SIZE,
  clampRoutineFoldersListPage,
  getRoutineFoldersListPage,
  getRoutineFoldersListTotalPages,
} from "@/app/(private)/rutinas/folder-list-pagination";
import type { RoutineFolderSummary } from "@/app/(private)/rutinas/runtime";

const buildFolders = (count: number): RoutineFolderSummary[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `folder-${index + 1}`,
    displayName: `Alumno ${index + 1}`,
    fileCount: index,
    studentProfileId: `profile-${index + 1}`,
    studentUserId: `user-${index + 1}`,
    storageKey: `student-${index + 1}@demo.com`,
    firstName: `Nombre${index + 1}`,
    lastName: `Apellido${index + 1}`,
    email: `student-${index + 1}@demo.com`,
  }));

describe("folder-list-pagination", () => {
  it("uses fixed 4-folder page size and skips controls for <=4 folders", () => {
    expect(ROUTINE_FOLDERS_LIST_PAGE_SIZE).toBe(4);
    expect(getRoutineFoldersListTotalPages(0)).toBe(1);
    expect(getRoutineFoldersListTotalPages(4)).toBe(1);
    expect(getRoutineFoldersListTotalPages(5)).toBe(2);
  });

  it("returns first 4 folders on page 1 and next slice on page 2", () => {
    const folders = buildFolders(7);

    const firstPage = getRoutineFoldersListPage(folders, 1);
    const secondPage = getRoutineFoldersListPage(folders, 2);

    expect(firstPage.currentPage).toBe(1);
    expect(firstPage.totalPages).toBe(2);
    expect(firstPage.visibleFolders.map((folder) => folder.id)).toEqual(["folder-1", "folder-2", "folder-3", "folder-4"]);

    expect(secondPage.currentPage).toBe(2);
    expect(secondPage.totalPages).toBe(2);
    expect(secondPage.visibleFolders.map((folder) => folder.id)).toEqual(["folder-5", "folder-6", "folder-7"]);
  });

  it("clamps invalid pages and handles filter-like shrink safely", () => {
    const allFolders = buildFolders(9);
    const filteredFolders = allFolders.slice(0, 4);

    const pageBeforeFilter = getRoutineFoldersListPage(allFolders, 3);
    const safePageAfterFilter = clampRoutineFoldersListPage(
      pageBeforeFilter.currentPage,
      getRoutineFoldersListTotalPages(filteredFolders.length)
    );
    const pageAfterFilter = getRoutineFoldersListPage(filteredFolders, safePageAfterFilter);

    expect(pageBeforeFilter.currentPage).toBe(3);
    expect(pageBeforeFilter.totalPages).toBe(3);
    expect(pageAfterFilter.currentPage).toBe(1);
    expect(pageAfterFilter.totalPages).toBe(1);
    expect(pageAfterFilter.visibleFolders.map((folder) => folder.id)).toEqual(["folder-1", "folder-2", "folder-3", "folder-4"]);
  });
});
