import { describe, expect, it, vi } from "vitest";

import {
  fetchRoutineFolderDetail,
  fetchRoutineFolders,
  deleteRoutineFile,
  getRoutineUiPermissions,
  loadRoutinesViewData,
  uploadRoutineFile,
  validateRoutineUpload,
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
              files: [],
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
          files: [],
        },
      ],
    });
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
            files: [],
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
  });

  it("validates file extension and max size before upload", () => {
    const invalidType = new File(["abc"], "rutina.doc", { type: "application/msword" });
    const tooLarge = new File([new Uint8Array(8)], "rutina.pdf", { type: "application/pdf" });

    expect(validateRoutineUpload(invalidType, 10 * 1024)).toMatch(/no soportado/i);
    expect(validateRoutineUpload(tooLarge, 4)).toMatch(/supera el máximo/i);
  });

  it("uploads and deletes using routines endpoints", async () => {
    const file = new File(["pdf-content"], "plan.pdf", { type: "application/pdf" });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          data: {
            id: "file-1",
            name: "plan.pdf",
            type: "pdf",
            path: "sp-1/plan--file-1.pdf",
            uploadedAt: "2026-04-19T12:00:00.000Z",
            sizeBytes: 10,
            observations: null,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            id: "file-1",
          },
        }),
      });

    const uploaded = await uploadRoutineFile(fetchMock as unknown as typeof fetch, {
      folderId: "folder-1",
      file,
      observations: "Semana 4",
    });

    await deleteRoutineFile(fetchMock as unknown as typeof fetch, uploaded.id);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/routines/folders/folder-1/files",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/routines/files/file-1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("surfaces API errors on upload", async () => {
    const file = new File(["pdf-content"], "plan.pdf", { type: "application/pdf" });

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        error: {
          message: "Ya existe un archivo con ese nombre en la carpeta del estudiante",
          code: "CONFLICT",
        },
      }),
    });

    await expect(
      uploadRoutineFile(fetchMock as unknown as typeof fetch, {
        folderId: "folder-1",
        file,
      })
    ).rejects.toThrow(/ya existe un archivo/i);
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
