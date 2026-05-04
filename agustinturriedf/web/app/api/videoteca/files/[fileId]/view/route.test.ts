import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/http/api-response";

const {
  requireSessionMock,
  getFileMock,
  getVideotecaAbsolutePathMock,
  statMock,
  createReadStreamMock,
  toWebMock,
} = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  getFileMock: vi.fn(),
  getVideotecaAbsolutePathMock: vi.fn(),
  statMock: vi.fn(),
  createReadStreamMock: vi.fn(),
  toWebMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/videoteca/service", () => ({
  videotecaService: {
    getFile: getFileMock,
  },
}));

vi.mock("@/features/videoteca/storage", () => ({
  getVideotecaAbsolutePath: getVideotecaAbsolutePathMock,
}));

vi.mock("node:fs/promises", () => ({
  stat: statMock,
}));

vi.mock("node:fs", () => ({
  createReadStream: createReadStreamMock,
}));

vi.mock("node:stream", () => ({
  Readable: {
    toWeb: toWebMock,
  },
}));

import { GET } from "@/app/api/videoteca/files/[fileId]/view/route";

describe("GET /api/videoteca/files/[fileId]/view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when fileId param is invalid", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    const response = await GET(new Request("http://localhost/api/videoteca/files/%20/view"), {
      params: Promise.resolve({ fileId: " " }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
      },
    });
    expect(getFileMock).not.toHaveBeenCalled();
    expect(statMock).not.toHaveBeenCalled();
  });

  it("streams image file inline with correct content-type", async () => {
    requireSessionMock.mockResolvedValue({ id: "student-1", role: "STUDENT" });

    const fileId = "file-1";

    getFileMock.mockResolvedValue({
      id: fileId,
      folderId: "folder-1",
      name: "plan.jpg",
      type: "image",
      extension: "jpg",
      duration: "—",
      updatedAt: "24 abr 2026",
      sizeBytes: 3,
      orderIndex: 1,
      path: "folder-1/plan--file-1.jpg",
    });

    getVideotecaAbsolutePathMock.mockReturnValue("/tmp/folder-1/plan--file-1.jpg");
    statMock.mockResolvedValue({
      size: 3,
      isFile: () => true,
    });
    const nodeStream = { kind: "node-stream" };
    createReadStreamMock.mockReturnValue(nodeStream);
    toWebMock.mockReturnValue(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("abc"));
          controller.close();
        },
      })
    );

    const response = await GET(new Request(`http://localhost/api/videoteca/files/${fileId}/view`), {
      params: Promise.resolve({ fileId }),
    });
    const responseText = await response.text();

    expect(response.status).toBe(200);
    expect(responseText).toBe("abc");
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("content-disposition")).toBeNull();
    expect(response.headers.get("content-length")).toBe("3");
    expect(getFileMock).toHaveBeenCalledWith({ id: "student-1", role: "STUDENT" }, fileId);
    expect(getVideotecaAbsolutePathMock).toHaveBeenCalledWith("folder-1/plan--file-1.jpg");
    expect(statMock).toHaveBeenCalledWith("/tmp/folder-1/plan--file-1.jpg");
    expect(createReadStreamMock).toHaveBeenCalledWith("/tmp/folder-1/plan--file-1.jpg");
    expect(toWebMock).toHaveBeenCalledWith(nodeStream);
  });

  it("streams video file inline with video content-type", async () => {
    requireSessionMock.mockResolvedValue({ id: "student-1", role: "STUDENT" });

    const fileId = "file-2";

    getFileMock.mockResolvedValue({
      id: fileId,
      folderId: "folder-1",
      name: "sentadilla.mp4",
      type: "video",
      extension: "mp4",
      duration: "—",
      updatedAt: "24 abr 2026",
      sizeBytes: 3,
      orderIndex: 1,
      path: "folder-1/sentadilla--file-2.mp4",
    });

    getVideotecaAbsolutePathMock.mockReturnValue("/tmp/folder-1/sentadilla--file-2.mp4");
    statMock.mockResolvedValue({
      size: 3,
      isFile: () => true,
    });
    const nodeStream = { kind: "node-stream" };
    createReadStreamMock.mockReturnValue(nodeStream);
    toWebMock.mockReturnValue(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("abc"));
          controller.close();
        },
      })
    );

    const response = await GET(new Request(`http://localhost/api/videoteca/files/${fileId}/view`), {
      params: Promise.resolve({ fileId }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("video/mp4");
    expect(response.headers.get("content-disposition")).toBeNull();
  });

  it("maps ENOENT storage misses to NOT_FOUND", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    const fileId = "file-1";
    getFileMock.mockResolvedValue({
      id: fileId,
      folderId: "folder-1",
      name: "plan.jpg",
      type: "image",
      extension: "jpg",
      duration: "—",
      updatedAt: "24 abr 2026",
      sizeBytes: 10,
      orderIndex: 1,
      path: "folder-1/plan--file-1.jpg",
    });

    getVideotecaAbsolutePathMock.mockReturnValue("/tmp/folder-1/plan--file-1.jpg");
    statMock.mockRejectedValue({ code: "ENOENT" });

    const response = await GET(new Request(`http://localhost/api/videoteca/files/${fileId}/view`), {
      params: Promise.resolve({ fileId }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      success: false,
      error: {
        message: "Archivo de videoteca no encontrado en storage",
        code: "NOT_FOUND",
      },
    });
  });

  it("maps service errors", async () => {
    requireSessionMock.mockResolvedValue({ id: "student-1", role: "STUDENT" });

    const fileId = "file-1";
    getFileMock.mockRejectedValue(new ApiError("No tenés permisos para acceder a este archivo", 403, "FORBIDDEN"));

    const response = await GET(new Request(`http://localhost/api/videoteca/files/${fileId}/view`), {
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
    expect(statMock).not.toHaveBeenCalled();
  });

  it("falls back to octet-stream for unknown extensions", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    const fileId = "file-3";

    getFileMock.mockResolvedValue({
      id: fileId,
      folderId: "folder-1",
      name: "documento.pdf",
      type: "image",
      extension: "pdf",
      duration: "—",
      updatedAt: "24 abr 2026",
      sizeBytes: 3,
      orderIndex: 1,
      path: "folder-1/documento--file-3.pdf",
    });

    getVideotecaAbsolutePathMock.mockReturnValue("/tmp/folder-1/documento--file-3.pdf");
    statMock.mockResolvedValue({
      size: 3,
      isFile: () => true,
    });
    const nodeStream = { kind: "node-stream" };
    createReadStreamMock.mockReturnValue(nodeStream);
    toWebMock.mockReturnValue(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("abc"));
          controller.close();
        },
      })
    );

    const response = await GET(new Request(`http://localhost/api/videoteca/files/${fileId}/view`), {
      params: Promise.resolve({ fileId }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/octet-stream");
  });
});