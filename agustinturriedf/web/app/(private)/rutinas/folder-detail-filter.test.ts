import { describe, expect, it } from "vitest";
import { filterRoutineFiles } from "@/app/(private)/rutinas/folder-detail-filter";
import type { RoutineFile } from "@/app/(private)/rutinas/runtime";

const makeFile = (name: string, type: string): RoutineFile =>
  ({
    id: `id-${Math.random().toString(36).slice(2)}`,
    name,
    type,
    sizeBytes: 1024,
    storageKey: `rutinas/fake/${name}`,
    previewToken: null,
    path: `/rutinas/fake/${name}`,
    uploadedAt: "2026-04-20T00:00:00.000Z",
    observations: null,
  }) as RoutineFile;

describe("filterRoutineFiles", () => {
  const files: RoutineFile[] = [
    makeFile("Rutina_enero_2024.xlsx", "xlsx"),
    makeFile("Rutina_febrero_2024.pdf", "pdf"),
    makeFile("planilla_ejercicios.xlsx", "xlsx"),
    makeFile("test_document.docx", "docx"),
  ];

  it("returns all files when query is empty", () => {
    expect(filterRoutineFiles(files, "")).toHaveLength(4);
    expect(filterRoutineFiles(files, "   ")).toHaveLength(4);
  });

  it("matches file name case-insensitively", () => {
    expect(filterRoutineFiles(files, "enero")).toHaveLength(1);
    // Only 2 files have "rutina" in the name (the first two)
    expect(filterRoutineFiles(files, "RUTINA")).toHaveLength(2);
    expect(filterRoutineFiles(files, "planilla")).toHaveLength(1);
  });

  it("matches file type case-insensitively", () => {
    expect(filterRoutineFiles(files, "xlsx")).toHaveLength(2);
    expect(filterRoutineFiles(files, "PDF")).toHaveLength(1);
    expect(filterRoutineFiles(files, "docx")).toHaveLength(1);
  });

  it("matches name OR type (combined OR logic)", () => {
    const result = filterRoutineFiles(files, "xlsx");
    expect(result).toHaveLength(2);
    // Should include both name-match and type-match files
    const names = result.map((f) => f.name);
    expect(names.some((n) => n.includes("Rutina_enero"))).toBe(true);
    expect(names.some((n) => n.includes("planilla"))).toBe(true);
  });

  it("returns empty array when no files match", () => {
    expect(filterRoutineFiles(files, "zzzzzz")).toHaveLength(0);
    expect(filterRoutineFiles(files, "xyz")).toHaveLength(0);
  });

  it("handles locale-aware matching", () => {
    const spanishFiles: RoutineFile[] = [
      makeFile("año_2024.xlsx", "xlsx"),
      makeFile("añejamiento.pdf", "pdf"),
    ];
    // Spanish-specific characters in query
    const result = filterRoutineFiles(spanishFiles, "año");
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("año_2024.xlsx");
  });

  it("trims whitespace from query", () => {
    expect(filterRoutineFiles(files, "  enero  ")).toHaveLength(1);
    expect(filterRoutineFiles(files, "\tplanilla\n")).toHaveLength(1);
  });

  it("returns the same reference when no filtering occurs", () => {
    const result = filterRoutineFiles(files, "");
    expect(result).toBe(files);
  });

  it("handles single file list", () => {
    const singleFile = [makeFile("only.xlsx", "xlsx")];
    expect(filterRoutineFiles(singleFile, "only")).toHaveLength(1);
    expect(filterRoutineFiles(singleFile, "xyz")).toHaveLength(0);
  });

  it("handles empty file list", () => {
    expect(filterRoutineFiles([], "enero")).toHaveLength(0);
    expect(filterRoutineFiles([], "")).toHaveLength(0);
  });
});