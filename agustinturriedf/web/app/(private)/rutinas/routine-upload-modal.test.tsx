import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const resolveRutinasFile = (...segments: string[]) =>
  path.join(process.cwd(), "app", "(private)", "rutinas", ...segments);

describe("routine-upload-modal source guard", () => {
  it("supports multi-file input with routines file type restrictions", () => {
    const source = readFileSync(resolveRutinasFile("routine-upload-modal.tsx"), "utf8");

    expect(source).toContain("type=\"file\"");
    expect(source).toContain("multiple");
    expect(source).toContain(".pdf,.xls,.xlsx");
    expect(source).toContain("validateRoutineFileForUpload");
  });

  it("keeps queue behavior and submit/cancel actions", () => {
    const source = readFileSync(resolveRutinasFile("routine-upload-modal.tsx"), "utf8");

    expect(source).toContain("No hay archivos en cola.");
    expect(source).toContain("Cancelar");
    expect(source).toContain("Subir");
    expect(source).toContain("isSubmitting");
    expect(source).toContain("onSubmit");
    expect(source).toContain("onClose");
    expect(source).toContain("queueReadyMessage");
    expect(source).toContain("queue.length > 0");
    expect(source).toContain("archivo");
    expect(source).toContain("listo");
    expect(source).toContain("progress_activity");
    expect(source).toContain("styles.uploadButtonIconLoading");
    expect(source).not.toContain("successMessage");
  });
});
