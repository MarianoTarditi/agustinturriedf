import { describe, expect, it, vi } from "vitest";

import {
  buildRoutinePreviewUrl,
  validateRoutineFileForUpload,
  uploadRoutineFiles,
  fetchRoutinePreviewBinary,
  fetchRoutineFolderDetail,
  fetchRoutineFolders,
  deleteRoutineFile,
  getRoutineUiPermissions,
  loadRoutinesViewData,
} from "@/app/(private)/rutinas/runtime";

describe("rutinas runtime", () => {
  it("resolves STUDENT view from /api/me/routines", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          id: "folder-1",
          studentProfileId: "sp-1",
          studentUserId: "student-1",
          displayName: "Mis rutinas",
          storageKey: "student:ana@example.com",
          files: [],
        },
      }),
    });

    const result = await loadRoutinesViewData(fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/me/routines",
      expect.objectContaining({ method: "GET", cache: "no-store" })
    );
    expect(result).toEqual({
      role: "STUDENT",
      folder: {
        id: "folder-1",
        studentProfileId: "sp-1",
        studentUserId: "student-1",
        displayName: "Mis rutinas",
        storageKey: "student:ana@example.com",
        files: [],
      },
    });
  });

  it("falls back to STAFF view when /api/me/routines returns 403", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          success: false,
          error: {
            message: "Solo STUDENT puede consultar su carpeta personal",
            code: "FORBIDDEN",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [
            {
              id: "folder-2",
              studentProfileId: "sp-2",
              studentUserId: "student-2",
              displayName: "Rutinas de Pedro",
              storageKey: "student:pedro@example.com",
              fileCount: 0,
              firstName: "Pedro",
              lastName: "Gómez",
              email: "pedro@example.com",
            },
          ],
        }),
      });

    const result = await loadRoutinesViewData(fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/me/routines",
      expect.objectContaining({ method: "GET", cache: "no-store" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/routines/folders",
      expect.objectContaining({ method: "GET", cache: "no-store" })
    );
    expect(result).toEqual({
      role: "STAFF",
      folders: [
          {
            id: "folder-2",
            studentProfileId: "sp-2",
            studentUserId: "student-2",
            displayName: "Rutinas de Pedro",
            storageKey: "student:pedro@example.com",
            fileCount: 0,
            firstName: "Pedro",
            lastName: "Gómez",
            email: "pedro@example.com",
          },
        ],
      });
    expect(result.role).toBe("STAFF");
    if (result.role !== "STAFF") {
      throw new Error("Expected STAFF routines view");
    }
    expect(result.folders[0]).not.toHaveProperty("files");
  });

  it("resolves STUDENT view with null folder when /api/me/routines returns 404", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        success: false,
        error: {
          message: "Carpeta de rutinas no encontrada",
          code: "NOT_FOUND",
        },
      }),
    });

    const result = await loadRoutinesViewData(fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ role: "STUDENT", folder: null });
  });

  it("loads folder detail from /api/routines/folders/[folderId]", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          id: "folder-1",
          studentProfileId: "sp-1",
          studentUserId: "student-1",
          displayName: "Rutinas de Ana",
          storageKey: "student:ana@example.com",
          files: [],
        },
      }),
    });

    const result = await fetchRoutineFolderDetail(fetchMock as unknown as typeof fetch, "folder-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/routines/folders/folder-1",
      expect.objectContaining({ method: "GET", cache: "no-store" })
    );
    expect(result.displayName).toBe("Rutinas de Ana");
  });

  it("loads folder grid for staff from /api/routines/folders", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [
            {
              id: "folder-2",
              studentProfileId: "sp-2",
              studentUserId: "student-2",
              displayName: "Rutinas de Pedro",
              storageKey: "student:pedro@example.com",
              fileCount: 0,
              firstName: "Pedro",
              lastName: "Gómez",
              email: "pedro@example.com",
            },
          ],
        }),
    });

    const folders = await fetchRoutineFolders(fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/routines/folders",
      expect.objectContaining({ method: "GET", cache: "no-store" })
    );
    expect(folders).toHaveLength(1);
    expect(folders[0]?.id).toBe("folder-2");
    expect(folders[0]).not.toHaveProperty("files");
  });

  it("deletes files using routines endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          id: "file-1",
        },
      }),
    });

    await deleteRoutineFile(fetchMock as unknown as typeof fetch, "file-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/routines/files/file-1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("builds preview URL for modal flows", () => {
    expect(buildRoutinePreviewUrl("file 1")).toBe("/api/routines/files/file%201/preview");
  });

  it("validates allowed routine upload file extensions", () => {
    expect(validateRoutineFileForUpload(new File(["pdf"], "plan.pdf", { type: "application/pdf" }))).toEqual({ ok: true });
    expect(validateRoutineFileForUpload(new File(["xls"], "plan.xls", { type: "application/vnd.ms-excel" }))).toEqual({ ok: true });
    expect(
      validateRoutineFileForUpload(
        new File(["xlsx"], "plan.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
      )
    ).toEqual({ ok: true });
  });

  it("rejects upload validation for invalid extension or empty files", () => {
    expect(validateRoutineFileForUpload(new File(["x"], "plan.doc", { type: "application/msword" }))).toEqual({
      ok: false,
      error: "Tipo de archivo no soportado. Solo se permiten PDF, XLS y XLSX.",
    });

    expect(validateRoutineFileForUpload(new File([], "vacio.pdf", { type: "application/pdf" }))).toEqual({
      ok: false,
      error: "El archivo no puede estar vacío.",
    });
  });

  it("uploads multiple files using files[] payload and returns normalized list", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: [
          {
            id: "file-1",
            name: "plan-a.pdf",
            type: "pdf",
            path: "sp-1/plan-a--file-1.pdf",
            uploadedAt: "2026-04-24T12:00:00.000Z",
            sizeBytes: 3,
            observations: null,
          },
          {
            id: "file-2",
            name: "plan-b.xlsx",
            type: "xlsx",
            path: "sp-1/plan-b--file-2.xlsx",
            uploadedAt: "2026-04-24T12:00:01.000Z",
            sizeBytes: 4,
            observations: null,
          },
        ],
      }),
    });

    const uploaded = await uploadRoutineFiles(fetchMock as unknown as typeof fetch, "folder-1", [
      new File(["abc"], "plan-a.pdf", { type: "application/pdf" }),
      new File(["abcd"], "plan-b.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/routines/folders/folder-1/files");
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe("POST");
    const body = (fetchMock.mock.calls[0]?.[1] as RequestInit).body;
    expect(body).toBeInstanceOf(FormData);
    const formData = body as FormData;
    const batchFiles = formData.getAll("files[]");
    expect(batchFiles).toHaveLength(2);
    expect((batchFiles[0] as File).name).toBe("plan-a.pdf");
    expect((batchFiles[1] as File).name).toBe("plan-b.xlsx");

    expect(uploaded).toHaveLength(2);
    expect(uploaded[0]?.id).toBe("file-1");
    expect(uploaded[1]?.id).toBe("file-2");
  });

  it("fetches preview binary from preview endpoint", async () => {
    const expectedBuffer = new Uint8Array([80, 75, 3, 4]).buffer;
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      arrayBuffer: async () => expectedBuffer,
    });

    const result = await fetchRoutinePreviewBinary(fetchMock as unknown as typeof fetch, "file-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/routines/files/file-1/preview",
      expect.objectContaining({ method: "GET", cache: "no-store" })
    );
    expect(result).toBe(expectedBuffer);
  });

  it("propagates preview fetch API error message", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        success: false,
        error: {
          message: "No tenés permisos para acceder a este archivo",
          code: "FORBIDDEN",
        },
      }),
    });

    await expect(fetchRoutinePreviewBinary(fetchMock as unknown as typeof fetch, "file-1")).rejects.toThrow(
      "No tenés permisos para acceder a este archivo"
    );
  });

  it("propagates upload API errors from batch endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: {
          message: "Tipo de archivo no soportado. Solo se permiten pdf, xls y xlsx",
          code: "VALIDATION_ERROR",
        },
      }),
    });

    await expect(
      uploadRoutineFiles(fetchMock as unknown as typeof fetch, "folder-1", [
        new File(["abc"], "plan.pdf", { type: "application/pdf" }),
      ])
    ).rejects.toThrow("Tipo de archivo no soportado. Solo se permiten pdf, xls y xlsx");
  });

  it("hides upload/delete/create-folder controls for student view", () => {
    expect(
      getRoutineUiPermissions({ role: "STUDENT", folder: { id: "folder-1" } as never })
    ).toEqual({
      canUploadFiles: false,
      canDeleteFiles: false,
      canCreateFolders: false,
      canDeleteFolders: false,
    });
  });

  it("does not allow manual folder CRUD even for staff view", () => {
    expect(
      getRoutineUiPermissions({ role: "STAFF", folders: [] })
    ).toEqual({
      canUploadFiles: true,
      canDeleteFiles: true,
      canCreateFolders: false,
      canDeleteFolders: false,
    });
  });
});
