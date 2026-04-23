import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, getFolderDetailMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  getFolderDetailMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/videoteca/service", () => ({
  videotecaService: {
    getFolderDetail: getFolderDetailMock,
  },
}));

import { GET } from "@/app/api/videoteca/folders/[folderId]/route";

describe("GET /api/videoteca/folders/[folderId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns folder detail payload", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });
    getFolderDetailMock.mockResolvedValue({
      id: "folder-1",
      name: "Rodilla",
      updatedAt: "23 abr 2026",
      fileCount: 1,
      tags: [],
      files: [],
    });

    const folderId = "folder-1";
    const response = await GET(new Request(`http://localhost/api/videoteca/folders/${folderId}`), {
      params: Promise.resolve({ folderId }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      data: {
        id: folderId,
      },
    });
  });
});
