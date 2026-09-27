import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/http/api-response";

const { requireSessionMock, listFolderFilesMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  listFolderFilesMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/routines/service", () => ({
  routinesService: {
    listFolderFiles: listFolderFilesMock,
  },
}));

import { GET } from "@/app/api/routines/folders/[folderId]/route";

describe("GET /api/routines/folders/[folderId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when folderId param is invalid", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    const response = await GET(new Request("http://localhost/api/routines/folders/invalid"), {
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
    expect(listFolderFilesMock).not.toHaveBeenCalled();
  });

  it("returns folder details when params and auth are valid", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });

    const folderId = "ck7m7x3k50000abcd1234efgh";

    listFolderFilesMock.mockResolvedValue({
      id: folderId,
      displayName: "Rutinas de Alumno",
      files: [{ id: "file-1", name: "plan.pdf", type: "pdf" }],
    });

    const response = await GET(new Request(`http://localhost/api/routines/folders/${folderId}`), {
      params: Promise.resolve({ folderId }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        id: folderId,
        displayName: "Rutinas de Alumno",
        files: [{ id: "file-1", name: "plan.pdf", type: "pdf" }],
      },
    });
    expect(listFolderFilesMock).toHaveBeenCalledWith({ id: "trainer-1", role: "TRAINER" }, folderId);
  });

  it("maps service ownership/permission errors", async () => {
    requireSessionMock.mockResolvedValue({ id: "student-1", role: "STUDENT" });

    const folderId = "ck7m7x3k50000abcd1234efgh";
    listFolderFilesMock.mockRejectedValue(new ApiError("No tenés permisos", 403, "FORBIDDEN"));

    const response = await GET(new Request(`http://localhost/api/routines/folders/${folderId}`), {
      params: Promise.resolve({ folderId }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: {
        message: "No tenés permisos",
        code: "FORBIDDEN",
      },
    });
  });
});
