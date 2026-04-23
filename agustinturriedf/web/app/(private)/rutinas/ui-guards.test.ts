import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const resolveRutinasFile = (...segments: string[]) =>
  path.join(process.cwd(), "app", "(private)", "rutinas", ...segments);

describe("rutinas UI guards", () => {
  it("keeps list and detail pages on the shared content wrapper", () => {
    const listPageSource = readFileSync(resolveRutinasFile("page.tsx"), "utf8");
    const detailPageSource = readFileSync(resolveRutinasFile("[folderId]", "page.tsx"), "utf8");

    expect(listPageSource).toContain('<div className={styles.content}>');
    expect(detailPageSource).toContain('<div className={styles.content}>');
  });

  it("keeps rutinas content geometry aligned with videoteca width contract", () => {
    const rutinasStyles = readFileSync(resolveRutinasFile("rutinas.module.css"), "utf8");

    expect(rutinasStyles).toContain(".content {");
    expect(rutinasStyles).toContain("width: min(100%, 82rem);");
    expect(rutinasStyles).toContain("margin: 0 auto;");
    expect(rutinasStyles).toContain("padding: 1.5rem 2rem 2rem;");
  });

  it("keeps /rutinas as folder list only and without manual folder CRUD controls", () => {
    const listPageSource = readFileSync(resolveRutinasFile("page.tsx"), "utf8");
    const rutinasStyles = readFileSync(resolveRutinasFile("rutinas.module.css"), "utf8");

    expect(listPageSource).toContain("Todavía no hay carpetas de alumnos.");
    expect(listPageSource).toContain("RoutineFolderGrid");
    expect(listPageSource).toContain("isStaffView ? (");
    expect(listPageSource).toContain("Buscar alumno por nombre o email...");
    expect(listPageSource).toContain('aria-label="Buscar alumno por nombre o email"');
    expect(listPageSource).toContain('type="search"');
    expect(listPageSource).toContain('name="search" className={styles.searchIcon}');
    expect(listPageSource).toContain("Más recientes");
    expect(listPageSource).toContain("A-Z");
    expect(listPageSource).toContain("Más archivos");
    expect(listPageSource).toContain("Todas");
    expect(listPageSource).toContain("Con archivos");
    expect(listPageSource).toContain("Sin archivos");
    expect(listPageSource).toContain("Vista de grilla");
    expect(listPageSource).toContain("Vista de lista");

    expect(listPageSource).not.toContain("create_new_folder");
    expect(listPageSource).not.toContain("Crear carpeta");
    expect(listPageSource).not.toContain("Nueva carpeta");
    expect(listPageSource).not.toContain("Subir archivo");
    expect(listPageSource).not.toContain("Eliminar archivo");

    expect(rutinasStyles).toContain(".searchWrap {");
    expect(rutinasStyles).toContain(".searchIcon {");
    expect(rutinasStyles).toContain(".searchWrap input {");
    expect(rutinasStyles).toContain("padding: 0.66rem 0.9rem 0.66rem 2.35rem;");
  });

  it("keeps /rutinas/[folderId] without manual folder CRUD and gates file actions by permissions", () => {
    const detailPageSource = readFileSync(resolveRutinasFile("[folderId]", "page.tsx"), "utf8");

    expect(detailPageSource).not.toContain("create_new_folder");
    expect(detailPageSource).not.toContain("Crear carpeta");
    expect(detailPageSource).not.toContain("Nueva carpeta");
    expect(detailPageSource).toContain("routinePermissions.canDeleteFiles");
    expect(detailPageSource).not.toContain("RoutineFolderGrid");
    expect(detailPageSource).not.toContain("fetchRoutineFolders");
    expect(detailPageSource).toContain("Volver a rutinas");
    expect(detailPageSource).not.toContain("Subir archivo");
    expect(detailPageSource).not.toContain("routine-file");
    expect(detailPageSource).not.toContain("styles.uploadSidebar");
  });
});
