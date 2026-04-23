import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, uploadFilesMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  uploadFilesMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/videoteca/service", () => ({
  videotecaService: {
    uploadFiles: uploadFilesMock,
  },
}));

import { POST } from "@/app/api/videoteca/folders/[folderId]/files/route";

describe("POST /api/videoteca/folders/[folderId]/files", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when files are missing", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });

    const folderId = "folder-1";
    const formData = new FormData();

    const response = await POST(
      new Request(`http://localhost/api/videoteca/folders/${folderId}/files`, {
        method: "POST",
        body: formData,
      }),
      {
        params: Promise.resolve({ folderId }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
      },
    });
    expect(uploadFilesMock).not.toHaveBeenCalled();
  });

  it("uploads files and returns 201", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    uploadFilesMock.mockResolvedValue([
      {
        id: "file-1",
        folderId: "folder-1",
        name: "video.mp4",
        type: "video",
        extension: "mp4",
        duration: "—",
        updatedAt: "23 abr 2026",
        sizeBytes: 10,
        orderIndex: 5,
      },
    ]);

    const folderId = "folder-1";
    const formData = new FormData();
    formData.append("files", new File(["abc"], "video.mp4", { type: "video/mp4" }));

    const response = await POST(
      new Request(`http://localhost/api/videoteca/folders/${folderId}/files`, {
        method: "POST",
        body: formData,
      }),
      {
        params: Promise.resolve({ folderId }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      success: true,
      data: [
        {
          id: "file-1",
          name: "video.mp4",
        },
      ],
    });
    expect(uploadFilesMock).toHaveBeenCalledWith(
      { id: "admin-1", role: "ADMIN" },
      expect.objectContaining({
        folderId,
      })
    );
  });
});
