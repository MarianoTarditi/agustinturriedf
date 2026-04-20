import { beforeEach, describe, expect, it, vi } from "vitest";

const { compareMock, findUniqueMock } = vi.hoisted(() => ({
  compareMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  compare: compareMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock,
    },
  },
}));

import { authorizeCredentials } from "@/features/auth/credentials";

describe("authorizeCredentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("authenticates valid credentials and returns session payload", async () => {
    findUniqueMock.mockResolvedValue({
      id: "admin-1",
      firstName: "Admin",
      lastName: "Root",
      email: "admin@example.com",
      role: "ADMIN",
      passwordHash: "hash",
      studentProfile: null,
    });
    compareMock.mockResolvedValue(true);

    const result = await authorizeCredentials({
      email: "admin@example.com",
      password: "123456789",
    });

    expect(result).toMatchObject({
      id: "admin-1",
      email: "admin@example.com",
      role: "ADMIN",
    });
  });

  it("rejects blocked students on login", async () => {
    findUniqueMock.mockResolvedValue({
      id: "student-1",
      firstName: "Bloq",
      lastName: "User",
      email: "student@example.com",
      role: "STUDENT",
      passwordHash: "hash",
      studentProfile: {
        id: "sp-1",
        status: "BLOCKED",
        trainerId: "trainer-1",
      },
    });
    compareMock.mockResolvedValue(true);

    const result = await authorizeCredentials({
      email: "student@example.com",
      password: "123456789",
    });

    expect(result).toBeNull();
  });
});
