import { describe, expect, it, vi } from "vitest";

import { replaceRoutineFile } from "@/app/(private)/rutinas/runtime";

describe("replaceRoutineFile", () => {
  it("sends POST with replaceFileId and file to the folder files endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: {
          id: "file-1",
          name: "plan-nuevo.pdf",
          type: "pdf",
          path: "sp-1/plan-nuevo--file-1.pdf",
          uploadedAt: "2026-04-25T12:00:00.000Z",
          sizeBytes: 2048,
          observations: null,
        },
      }),
    });

    const result = await replaceRoutineFile(
      fetchMock as unknown as typeof fetch,
      "folder-1",
      "file-1",
      new File(["pdf content"], "plan-nuevo.pdf", { type: "application/pdf" })
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/routines/folders/folder-1/files");
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe("POST");

    const body = (fetchMock.mock.calls[0]?.[1] as RequestInit).body;
    expect(body).toBeInstanceOf(FormData);
    const formData = body as FormData;
    expect(formData.get("file")).toBeInstanceOf(File);
    expect(formData.get("replaceFileId")).toBe("file-1");

    expect(result.id).toBe("file-1");
    expect(result.name).toBe("plan-nuevo.pdf");
  });

  it("validates the file before sending to the API", async () => {
    const fetchMock = vi.fn();

    await expect(
      replaceRoutineFile(
        fetchMock as unknown as typeof fetch,
        "folder-1",
        "file-1",
        new File([], "vacio.pdf", { type: "application/pdf" })
      )
    ).rejects.toThrow("El archivo no puede estar vacío.");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-allowed file types", async () => {
    const fetchMock = vi.fn();

    await expect(
      replaceRoutineFile(
        fetchMock as unknown as typeof fetch,
        "folder-1",
        "file-1",
        new File(["doc content"], "plan.doc", { type: "application/msword" })
      )
    ).rejects.toThrow("Tipo de archivo no soportado. Solo se permiten PDF, XLS y XLSX.");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propagates API errors from the replace endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: {
          message: "El archivo no puede estar vacío",
          code: "VALIDATION_ERROR",
        },
      }),
    });

    await expect(
      replaceRoutineFile(
        fetchMock as unknown as typeof fetch,
        "folder-1",
        "file-1",
        new File(["pdf"], "plan.pdf", { type: "application/pdf" })
      )
    ).rejects.toThrow("El archivo no puede estar vacío");
  });
});
