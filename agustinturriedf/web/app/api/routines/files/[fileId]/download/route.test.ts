import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/http/api-response";

const { requireSessionMock, getFileMock, getRoutineAbsolutePathMock, readFileMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  getFileMock: vi.fn(),
  getRoutineAbsolutePathMock: vi.fn(),
  readFileMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/routines/service", () => ({
  routinesService: {
    getFile: getFileMock,
  },
}));

vi.mock("@/features/routines/storage", () => ({
  getRoutineAbsolutePath: getRoutineAbsolutePathMock,
}));

vi.mock("node:fs/promises", () => ({
  readFile: readFileMock,
}));

import { GET } from "@/app/api/routines/files/[fileId]/download/route";

describe("GET /api/routines/files/[fileId]/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when fileId param is invalid", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    const response = await GET(new Request("http://localhost/api/routines/files/invalid/download"), {
      params: Promise.resolve({ fileId: "invalid" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
      },
    });
    expect(getFileMock).not.toHaveBeenCalled();
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it("returns file as attachment for authorized actor", async () => {
    requireSessionMock.mockResolvedValue({ id: "student-1", role: "STUDENT" });

    const fileId = "ck7m7x3k50000abcd1234efgh";

    getFileMock.mockResolvedValue({
      id: fileId,
      name: "Plan Fuerza 1.pdf",
      type: "pdf",
      path: "sp-1/plan-fuerza--file-1.pdf",
      uploadedAt: "2026-04-19T12:00:00.000Z",
      sizeBytes: 3,
      observations: null,
    });

    getRoutineAbsolutePathMock.mockReturnValue("/tmp/sp-1/plan-fuerza--file-1.pdf");
    readFileMock.mockResolvedValue(Buffer.from("abc"));

    const response = await GET(new Request(`http://localhost/api/routines/files/${fileId}/download`), {
      params: Promise.resolve({ fileId }),
    });
    const responseText = await response.text();

    expect(response.status).toBe(200);
    expect(responseText).toBe("abc");
    expect(response.headers.get("content-type")).toBe("application/octet-stream");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="Plan%20Fuerza%201.pdf"'
    );
    expect(getFileMock).toHaveBeenCalledWith({ id: "student-1", role: "STUDENT" }, fileId);
    expect(getRoutineAbsolutePathMock).toHaveBeenCalledWith("sp-1/plan-fuerza--file-1.pdf");
    expect(readFileMock).toHaveBeenCalledWith("/tmp/sp-1/plan-fuerza--file-1.pdf");
  });

  it("maps ENOENT storage misses to NOT_FOUND", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    const fileId = "ck7m7x3k50000abcd1234efgh";
    getFileMock.mockResolvedValue({
      id: fileId,
      name: "plan.pdf",
      type: "pdf",
      path: "sp-1/plan--file-1.pdf",
      uploadedAt: "2026-04-19T12:00:00.000Z",
      sizeBytes: 3,
      observations: null,
    });

    getRoutineAbsolutePathMock.mockReturnValue("/tmp/sp-1/plan--file-1.pdf");
    readFileMock.mockRejectedValue({ code: "ENOENT" });

    const response = await GET(new Request(`http://localhost/api/routines/files/${fileId}/download`), {
      params: Promise.resolve({ fileId }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      success: false,
      error: {
        message: "Archivo de rutina no encontrado en storage",
        code: "NOT_FOUND",
      },
    });
  });

  it("maps service ownership/permission errors", async () => {
    requireSessionMock.mockResolvedValue({ id: "student-1", role: "STUDENT" });

    const fileId = "ck7m7x3k50000abcd1234efgh";
    getFileMock.mockRejectedValue(new ApiError("No tenés permisos para acceder a este archivo", 403, "FORBIDDEN"));

    const response = await GET(new Request(`http://localhost/api/routines/files/${fileId}/download`), {
      params: Promise.resolve({ fileId }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: {
        message: "No tenés permisos para acceder a este archivo",
        code: "FORBIDDEN",
      },
    });
    expect(readFileMock).not.toHaveBeenCalled();
  });
});
