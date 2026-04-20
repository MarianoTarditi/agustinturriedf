import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/http/api-response";

const { requireSessionMock, deleteFileMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  deleteFileMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/routines/service", () => ({
  routinesService: {
    deleteFile: deleteFileMock,
  },
}));

import { DELETE } from "@/app/api/routines/files/[fileId]/route";

describe("DELETE /api/routines/files/[fileId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when fileId param is invalid", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    const response = await DELETE(new Request("http://localhost/api/routines/files/invalid", { method: "DELETE" }), {
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
    expect(deleteFileMock).not.toHaveBeenCalled();
  });

  it("deletes file and returns deleted metadata", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });

    const fileId = "ck7m7x3k50000abcd1234efgh";
    deleteFileMock.mockResolvedValue({
      id: fileId,
      name: "plan.xlsx",
      type: "xlsx",
      path: "sp-1/plan--file-1.xlsx",
      uploadedAt: "2026-04-19T11:00:00.000Z",
      sizeBytes: 140,
      observations: null,
    });

    const response = await DELETE(new Request(`http://localhost/api/routines/files/${fileId}`, { method: "DELETE" }), {
      params: Promise.resolve({ fileId }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        id: fileId,
        name: "plan.xlsx",
        type: "xlsx",
        path: "sp-1/plan--file-1.xlsx",
        uploadedAt: "2026-04-19T11:00:00.000Z",
        sizeBytes: 140,
        observations: null,
      },
    });
    expect(deleteFileMock).toHaveBeenCalledWith({ id: "trainer-1", role: "TRAINER" }, fileId);
  });

  it("maps service auth/ownership errors", async () => {
    requireSessionMock.mockResolvedValue({ id: "student-1", role: "STUDENT" });

    const fileId = "ck7m7x3k50000abcd1234efgh";
    deleteFileMock.mockRejectedValue(new ApiError("Solo ADMIN y TRAINER pueden eliminar rutinas", 403, "FORBIDDEN"));

    const response = await DELETE(new Request(`http://localhost/api/routines/files/${fileId}`, { method: "DELETE" }), {
      params: Promise.resolve({ fileId }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: {
        message: "Solo ADMIN y TRAINER pueden eliminar rutinas",
        code: "FORBIDDEN",
      },
    });
  });
});
