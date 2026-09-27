import { describe, expect, it } from "vitest";

import { deriveRoutineFolders } from "@/app/(private)/rutinas/page-derived-list";
import type { RoutineFolderSummary } from "@/app/(private)/rutinas/runtime";

const buildFolder = (partial: Partial<RoutineFolderSummary> & Pick<RoutineFolderSummary, "id" | "displayName">): RoutineFolderSummary => ({
  id: partial.id,
  displayName: partial.displayName,
  fileCount: partial.fileCount ?? 0,
  studentProfileId: partial.studentProfileId ?? `profile-${partial.id}`,
  studentUserId: partial.studentUserId ?? `user-${partial.id}`,
  storageKey: partial.storageKey ?? `student:${partial.id}@demo.com`,
  firstName: partial.firstName ?? `Nombre${partial.id}`,
  lastName: partial.lastName ?? `Apellido${partial.id}`,
  email: partial.email ?? `${partial.id}@demo.com`,
});

describe("deriveRoutineFolders", () => {
  const folders: RoutineFolderSummary[] = [
    buildFolder({ id: "3", displayName: "Zulu", firstName: "Catalina", lastName: "Zárate", email: "cata@demo.com", fileCount: 4 }),
    buildFolder({ id: "1", displayName: "Ana", firstName: "Ana", lastName: "Pérez", email: "ana@demo.com", fileCount: 0 }),
    buildFolder({ id: "2", displayName: "Bruno", firstName: "Bruno", lastName: "López", email: "bruno.lopez@demo.com", fileCount: 2 }),
  ];

  it("keeps original order for 'Más recientes'", () => {
    const result = deriveRoutineFolders(folders, { query: "", sortBy: "recent", filterBy: "all" });

    expect(result.map((folder) => folder.id)).toEqual(["3", "1", "2"]);
  });

  it("sorts alphabetically and supports file-count filters", () => {
    const alphabetical = deriveRoutineFolders(folders, { query: "", sortBy: "alphabetical", filterBy: "all" });
    const withFiles = deriveRoutineFolders(folders, { query: "", sortBy: "more-files", filterBy: "with-files" });
    const withoutFiles = deriveRoutineFolders(folders, { query: "", sortBy: "recent", filterBy: "without-files" });

    expect(alphabetical.map((folder) => folder.displayName)).toEqual(["Ana", "Bruno", "Zulu"]);
    expect(withFiles.map((folder) => folder.id)).toEqual(["3", "2"]);
    expect(withoutFiles.map((folder) => folder.id)).toEqual(["1"]);
  });

  it("matches query by first name, last name and email with trim + case-insensitive behavior", () => {
    const byFirstName = deriveRoutineFolders(folders, { query: "  cAtA  ", sortBy: "recent", filterBy: "all" });
    const byLastName = deriveRoutineFolders(folders, { query: "lópez", sortBy: "recent", filterBy: "all" });
    const byEmail = deriveRoutineFolders(folders, { query: "BRUNO.LOPEZ@", sortBy: "recent", filterBy: "all" });

    expect(byFirstName.map((folder) => folder.id)).toEqual(["3"]);
    expect(byLastName.map((folder) => folder.id)).toEqual(["2"]);
    expect(byEmail.map((folder) => folder.id)).toEqual(["2"]);
  });

  it("composes query with existing filter and sort controls", () => {
    const result = deriveRoutineFolders(folders, {
      query: "demo.com",
      sortBy: "more-files",
      filterBy: "with-files",
    });

    expect(result.map((folder) => folder.id)).toEqual(["3", "2"]);
  });
});
