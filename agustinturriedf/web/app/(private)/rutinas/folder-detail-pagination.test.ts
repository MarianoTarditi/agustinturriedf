import { describe, expect, it } from "vitest";

import {
  ROUTINE_FILES_PAGE_SIZE,
  clampRoutineFilesPage,
  getRoutineFilePage,
  getRoutineFilesTotalPages,
} from "@/app/(private)/rutinas/folder-detail-pagination";
import type { RoutineFile } from "@/app/(private)/rutinas/runtime";

const buildFile = (index: number): RoutineFile => ({
  id: `file-${index}`,
  name: `archivo-${index}.pdf`,
  type: "pdf",
  path: `/rutinas/archivo-${index}.pdf`,
  uploadedAt: "2026-04-20T00:00:00.000Z",
  sizeBytes: 1024 * index,
  observations: null,
});

describe("folder-detail-pagination", () => {
  it("uses fixed 5-file page size and skips controls for <=5 files", () => {
    const files = Array.from({ length: 5 }, (_, index) => buildFile(index + 1));

    expect(ROUTINE_FILES_PAGE_SIZE).toBe(5);
    expect(getRoutineFilesTotalPages(files.length)).toBe(1);
    expect(getRoutineFilePage(files, 1).visibleFiles).toHaveLength(5);
  });

  it("returns first 5 files on page 1 and next slice on page 2", () => {
    const files = Array.from({ length: 8 }, (_, index) => buildFile(index + 1));

    const firstPage = getRoutineFilePage(files, 1);
    const secondPage = getRoutineFilePage(files, 2);

    expect(firstPage.totalPages).toBe(2);
    expect(firstPage.visibleFiles.map((file) => file.id)).toEqual(["file-1", "file-2", "file-3", "file-4", "file-5"]);
    expect(secondPage.visibleFiles.map((file) => file.id)).toEqual(["file-6", "file-7", "file-8"]);
  });

  it("clamps invalid pages and handles delete-like shrink safely", () => {
    const initialFiles = Array.from({ length: 11 }, (_, index) => buildFile(index + 1));
    const pageBeforeDelete = getRoutineFilePage(initialFiles, 3);
    const filesAfterDelete = initialFiles.slice(0, 10);
    const pageAfterDelete = getRoutineFilePage(filesAfterDelete, pageBeforeDelete.currentPage);

    expect(pageBeforeDelete.currentPage).toBe(3);
    expect(pageBeforeDelete.totalPages).toBe(3);
    expect(pageAfterDelete.currentPage).toBe(2);
    expect(pageAfterDelete.totalPages).toBe(2);
    expect(pageAfterDelete.visibleFiles.map((file) => file.id)).toEqual(["file-6", "file-7", "file-8", "file-9", "file-10"]);
    expect(clampRoutineFilesPage(0, 2)).toBe(1);
    expect(clampRoutineFilesPage(99, 2)).toBe(2);
    expect(clampRoutineFilesPage(Number.NaN, 2)).toBe(1);
  });

  it("returns stable single-page metadata for empty lists", () => {
    const emptyPage = getRoutineFilePage([], 5);

    expect(emptyPage.currentPage).toBe(1);
    expect(emptyPage.totalPages).toBe(1);
    expect(emptyPage.visibleFiles).toEqual([]);
  });
});
