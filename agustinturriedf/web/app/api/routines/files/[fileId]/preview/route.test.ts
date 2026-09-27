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

import { GET } from "@/app/api/routines/files/[fileId]/preview/route";

describe("GET /api/routines/files/[fileId]/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth failures from session guard", async () => {
    requireSessionMock.mockRejectedValue(new ApiError("No autenticado", 401, "UNAUTHORIZED"));

    const response = await GET(new Request("http://localhost/api/routines/files/file-1/preview"), {
      params: Promise.resolve({ fileId: "ck7m7x3k50000abcd1234efgh" }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: {
        message: "No autenticado",
        code: "UNAUTHORIZED",
      },
    });
    expect(getFileMock).not.toHaveBeenCalled();
  });

  it("returns 400 when fileId param is invalid", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    const response = await GET(new Request("http://localhost/api/routines/files/invalid/preview"), {
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

  it("returns PDF with inline disposition", async () => {
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
    readFileMock.mockResolvedValue(Buffer.from("pdf"));

    const response = await GET(new Request(`http://localhost/api/routines/files/${fileId}/preview`), {
      params: Promise.resolve({ fileId }),
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("pdf");
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe('inline; filename="Plan%20Fuerza%201.pdf"');
  });

  it("returns xls with inline excel MIME", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    const fileId = "ck7m7x3k50000abcd1234efgh";

    getFileMock.mockResolvedValue({
      id: fileId,
      name: "Rutina abril.xls",
      type: "xls",
      path: "sp-1/rutina-abril.xls",
      uploadedAt: "2026-04-19T12:00:00.000Z",
      sizeBytes: 3,
      observations: null,
    });
    getRoutineAbsolutePathMock.mockReturnValue("/tmp/sp-1/rutina-abril.xls");
    readFileMock.mockResolvedValue(Buffer.from("xls"));

    const response = await GET(new Request(`http://localhost/api/routines/files/${fileId}/preview`), {
      params: Promise.resolve({ fileId }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/vnd.ms-excel"
    );
    expect(response.headers.get("content-disposition")).toBe('inline; filename="Rutina%20abril.xls"');
  });

  it("returns xlsx with OOXML MIME", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    const fileId = "ck7m7x3k50000abcd1234efgh";

    getFileMock.mockResolvedValue({
      id: fileId,
      name: "Rutina mayo.xlsx",
      type: "xlsx",
      path: "sp-1/rutina-mayo.xlsx",
      uploadedAt: "2026-04-19T12:00:00.000Z",
      sizeBytes: 3,
      observations: null,
    });
    getRoutineAbsolutePathMock.mockReturnValue("/tmp/sp-1/rutina-mayo.xlsx");
    readFileMock.mockResolvedValue(Buffer.from("xlsx"));

    const response = await GET(new Request(`http://localhost/api/routines/files/${fileId}/preview`), {
      params: Promise.resolve({ fileId }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
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

    const response = await GET(new Request(`http://localhost/api/routines/files/${fileId}/preview`), {
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
});
