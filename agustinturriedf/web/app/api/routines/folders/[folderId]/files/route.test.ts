import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/http/api-response";

const { requireSessionMock, uploadFileMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  uploadFileMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/routines/service", () => ({
  routinesService: {
    uploadFile: uploadFileMock,
  },
}));

import { POST } from "@/app/api/routines/folders/[folderId]/files/route";

describe("POST /api/routines/folders/[folderId]/files", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when folderId param is invalid", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    const formData = new FormData();
    formData.set("file", new File(["abc"], "plan.pdf", { type: "application/pdf" }));

    const response = await POST(new Request("http://localhost/api/routines/folders/invalid/files", { method: "POST", body: formData }), {
      params: Promise.resolve({ folderId: "invalid" }),
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
    expect(uploadFileMock).not.toHaveBeenCalled();
  });

  it("returns 400 when form file is missing", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });

    const formData = new FormData();

    const folderId = "ck7m7x3k50000abcd1234efgh";
    const response = await POST(new Request(`http://localhost/api/routines/folders/${folderId}/files`, { method: "POST", body: formData }), {
      params: Promise.resolve({ folderId }),
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
    expect(uploadFileMock).not.toHaveBeenCalled();
  });

  it("uploads file and returns 201 when payload/session are valid", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    const folderId = "ck7m7x3k50000abcd1234efgh";
    uploadFileMock.mockResolvedValue({
      id: "file-1",
      name: "plan.pdf",
      type: "pdf",
      path: "sp-1/plan--file-1.pdf",
      uploadedAt: "2026-04-19T12:00:00.000Z",
      sizeBytes: 3,
      observations: "ok",
    });

    const formData = new FormData();
    formData.set("file", new File(["abc"], "plan.pdf", { type: "application/pdf" }));
    formData.set("observations", "  ok  ");
    formData.set("replaceFileId", "ck7m7x3k50000abcd1234efgh");

    const response = await POST(new Request(`http://localhost/api/routines/folders/${folderId}/files`, { method: "POST", body: formData }), {
      params: Promise.resolve({ folderId }),
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      success: true,
      data: {
        id: "file-1",
        name: "plan.pdf",
        type: "pdf",
        path: "sp-1/plan--file-1.pdf",
        uploadedAt: "2026-04-19T12:00:00.000Z",
        sizeBytes: 3,
        observations: "ok",
      },
    });
    expect(uploadFileMock).toHaveBeenCalledWith(
      { id: "admin-1", role: "ADMIN" },
      expect.objectContaining({
        folderId,
        originalName: "plan.pdf",
        sizeBytes: 3,
        observations: "ok",
        replaceFileId: "ck7m7x3k50000abcd1234efgh",
      })
    );

    const uploadPayload = uploadFileMock.mock.calls[0][1] as { content: unknown };
    expect(Buffer.isBuffer(uploadPayload.content)).toBe(true);
  });

  it("returns 400 when replaceFileId is not a valid cuid", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });

    const folderId = "ck7m7x3k50000abcd1234efgh";
    const formData = new FormData();
    formData.set("file", new File(["abc"], "plan.pdf", { type: "application/pdf" }));
    formData.set("replaceFileId", "invalid-id");

    const response = await POST(new Request(`http://localhost/api/routines/folders/${folderId}/files`, { method: "POST", body: formData }), {
      params: Promise.resolve({ folderId }),
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
    expect(uploadFileMock).not.toHaveBeenCalled();
  });

  it("propagates ambiguity contract from service", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });
    uploadFileMock.mockRejectedValue(
      new ApiError("Hay más de un candidato", 409, "AMBIGUOUS_REPLACEMENT", {
        candidates: [
          { id: "file-1", name: "rutina-1.pdf", type: "pdf", uploadedAt: "2026-04-20T10:00:00.000Z" },
          { id: "file-2", name: "rutina-2.pdf", type: "pdf", uploadedAt: "2026-04-20T09:00:00.000Z" },
        ],
      })
    );

    const folderId = "ck7m7x3k50000abcd1234efgh";
    const formData = new FormData();
    formData.set("file", new File(["abc"], "plan.pdf", { type: "application/pdf" }));

    const response = await POST(new Request(`http://localhost/api/routines/folders/${folderId}/files`, { method: "POST", body: formData }), {
      params: Promise.resolve({ folderId }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: "AMBIGUOUS_REPLACEMENT",
        details: {
          candidates: expect.any(Array),
        },
      },
    });
  });

  it("maps service permission/ownership errors", async () => {
    requireSessionMock.mockResolvedValue({ id: "student-1", role: "STUDENT" });
    uploadFileMock.mockRejectedValue(new ApiError("Solo ADMIN y TRAINER pueden subir rutinas", 403, "FORBIDDEN"));

    const folderId = "ck7m7x3k50000abcd1234efgh";
    const formData = new FormData();
    formData.set("file", new File(["abc"], "plan.pdf", { type: "application/pdf" }));

    const response = await POST(new Request(`http://localhost/api/routines/folders/${folderId}/files`, { method: "POST", body: formData }), {
      params: Promise.resolve({ folderId }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: {
        message: "Solo ADMIN y TRAINER pueden subir rutinas",
        code: "FORBIDDEN",
      },
    });
  });
});
