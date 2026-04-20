import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const resolveRutinasFile = (...segments: string[]) =>
  path.join(process.cwd(), "app", "(private)", "rutinas", ...segments);

describe("rutinas UI guards", () => {
  it("keeps /rutinas as folder list only and without manual folder CRUD controls", () => {
    const listPageSource = readFileSync(resolveRutinasFile("page.tsx"), "utf8");

    expect(listPageSource).toContain("Carpetas de alumnos");
    expect(listPageSource).toContain("RoutineFolderGrid");

    expect(listPageSource).not.toContain("create_new_folder");
    expect(listPageSource).not.toContain("Crear carpeta");
    expect(listPageSource).not.toContain("Nueva carpeta");
    expect(listPageSource).not.toContain("Subir archivo");
    expect(listPageSource).not.toContain("Eliminar archivo");
  });

  it("keeps /rutinas/[folderId] without manual folder CRUD and gates file actions by permissions", () => {
    const detailPageSource = readFileSync(resolveRutinasFile("[folderId]", "page.tsx"), "utf8");

    expect(detailPageSource).not.toContain("create_new_folder");
    expect(detailPageSource).not.toContain("Crear carpeta");
    expect(detailPageSource).not.toContain("Nueva carpeta");
    expect(detailPageSource).toContain("routinePermissions.canUploadFiles");
    expect(detailPageSource).toContain("routinePermissions.canDeleteFiles");
  });
});
