import { describe, expect, it } from "vitest";

import {
  buildRoutineRelativePath,
  buildRoutineStorageFileName,
  getRoutineAbsolutePath,
  sanitizeRoutineFileBaseName,
} from "@/features/routines/storage";

describe("routines storage helpers", () => {
  it("normalizes routine base names with accents/symbols", () => {
    expect(sanitizeRoutineFileBaseName("  Rutína Fuerza++ 2026.xlsx ")).toBe("rutina-fuerza-2026");
    expect(sanitizeRoutineFileBaseName("....")).toBe("archivo");
  });

  it("builds deterministic storage filename and relative path", () => {
    const storageName = buildRoutineStorageFileName({
      originalName: "Plan Semana 4.PDF",
      fileId: "file-1",
      type: "pdf",
    });

    expect(storageName).toBe("plan-semana-4--file-1.pdf");
    expect(buildRoutineRelativePath("sp-1", storageName)).toBe("sp-1/plan-semana-4--file-1.pdf");
  });

  it("rejects traversal attempts when resolving absolute path", () => {
    expect(() => getRoutineAbsolutePath("../outside.pdf")).toThrow("Ruta de rutina inválida");
  });
});
