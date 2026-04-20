import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, findByIdMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findByIdMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/features/users/repository", () => ({
  userRepository: {
    findById: findByIdMock,
  },
}));

import { requireSession } from "@/features/auth/session";

describe("requireSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests with 401", async () => {
    authMock.mockResolvedValue(null);

    await expect(requireSession()).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
    });
  });

  it("rejects blocked students using DB-backed status with 403", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "student-1",
        role: "STUDENT",
        studentStatus: "ACTIVE",
      },
    });

    findByIdMock.mockResolvedValue({
      id: "student-1",
      role: "STUDENT",
      studentProfile: {
        id: "profile-1",
        trainerId: "trainer-1",
        status: "BLOCKED",
      },
    });

    await expect(requireSession()).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
    expect(findByIdMock).toHaveBeenCalledWith("student-1");
  });
});
