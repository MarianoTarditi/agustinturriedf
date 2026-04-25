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
      passwordUpdatedAt: new Date("2026-01-01T10:00:00.000Z"),
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
      passwordUpdatedAt: "2026-01-01T10:00:00.000Z",
    });
  });

  it("allows student due today and propagates payment status", async () => {
    findUniqueMock.mockResolvedValue({
      id: "student-1",
      firstName: "Duen",
      lastName: "Hoy",
      email: "student@example.com",
      role: "STUDENT",
      passwordHash: "hash",
      photoUrl: null,
      studentProfile: {
        id: "sp-1",
        status: "ACTIVE",
        trainerId: "trainer-1",
        currentPayment: {
          dueDate: new Date(),
        },
      },
    });
    compareMock.mockResolvedValue(true);

    const result = await authorizeCredentials({
      email: "student@example.com",
      password: "123456789",
    });

    expect(result).toMatchObject({
      id: "student-1",
      paymentStatus: "CURRENT",
    });
  });

  it("rejects overdue students on login", async () => {
    findUniqueMock.mockResolvedValue({
      id: "student-1",
      firstName: "Bloq",
      lastName: "User",
      email: "student@example.com",
      role: "STUDENT",
      passwordHash: "hash",
      photoUrl: null,
      studentProfile: {
        id: "sp-1",
        status: "ACTIVE",
        trainerId: "trainer-1",
        currentPayment: {
          dueDate: new Date("2020-01-01T00:00:00.000Z"),
        },
      },
    });
    compareMock.mockResolvedValue(true);

    const result = await authorizeCredentials({
      email: "student@example.com",
      password: "123456789",
    });

    expect(result).toBeNull();
  });

  it("rejects login when password no longer matches stored hash", async () => {
    findUniqueMock.mockResolvedValue({
      id: "user-1",
      firstName: "Nue",
      lastName: "Pass",
      email: "user@example.com",
      role: "ADMIN",
      passwordHash: "new-hash",
      passwordUpdatedAt: new Date("2026-02-01T10:00:00.000Z"),
      studentProfile: null,
    });
    compareMock.mockResolvedValue(false);

    const result = await authorizeCredentials({
      email: "user@example.com",
      password: "old-password",
    });

    expect(result).toBeNull();
  });
});
