import { describe, expect, it } from "vitest";

import {
  buildVideotecaRelativePath,
  buildVideotecaStorageFileName,
  getVideotecaAbsolutePath,
  sanitizeVideotecaFileBaseName,
} from "@/features/videoteca/storage";

describe("videoteca storage helpers", () => {
  it("normalizes file base names with accents/symbols", () => {
    expect(sanitizeVideotecaFileBaseName("  Prógreso Pierna++ 2026.MP4 ")).toBe("progreso-pierna-2026");
    expect(sanitizeVideotecaFileBaseName("....")).toBe("archivo");
  });

  it("builds deterministic storage filename and relative path", () => {
    const storageName = buildVideotecaStorageFileName({
      originalName: "Sentadilla Técnica.PNG",
      fileId: "file-1",
      type: "png",
    });

    expect(storageName).toBe("sentadilla-tecnica--file-1.png");
    expect(buildVideotecaRelativePath("folder-1", storageName)).toBe("folder-1/sentadilla-tecnica--file-1.png");
  });

  it("rejects traversal attempts when resolving absolute path", () => {
    expect(() => getVideotecaAbsolutePath("../outside.mp4")).toThrow("Ruta de videoteca inválida");
  });
});
