import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/http/api-response";

const { requireSessionMock, listOwnFolderMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  listOwnFolderMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/routines/service", () => ({
  routinesService: {
    listOwnFolder: listOwnFolderMock,
  },
}));

import { GET } from "@/app/api/me/routines/route";

describe("GET /api/me/routines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns own routines folder for student session", async () => {
    requireSessionMock.mockResolvedValue({ id: "student-1", role: "STUDENT" });
    listOwnFolderMock.mockResolvedValue({ id: "folder-1", displayName: "Mis rutinas", files: [] });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: { id: "folder-1", displayName: "Mis rutinas", files: [] },
    });
    expect(listOwnFolderMock).toHaveBeenCalledWith({ id: "student-1", role: "STUDENT" });
  });

  it("maps non-student access restriction from service", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });
    listOwnFolderMock.mockRejectedValue(
      new ApiError("Solo STUDENT puede consultar su carpeta personal", 403, "FORBIDDEN")
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: {
        message: "Solo STUDENT puede consultar su carpeta personal",
        code: "FORBIDDEN",
      },
    });
  });
});
