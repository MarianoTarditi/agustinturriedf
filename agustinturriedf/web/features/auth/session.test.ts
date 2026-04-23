import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, findUniqueMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock,
    },
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

  it("rejects overdue students with PAYMENT_REQUIRED", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "student-1",
        role: "STUDENT",
        studentStatus: "ACTIVE",
      },
    });

    findUniqueMock.mockResolvedValue({
      id: "student-1",
      role: "STUDENT",
      studentProfile: {
        id: "profile-1",
        trainerId: "trainer-1",
        status: "ACTIVE",
        currentPayment: {
          dueDate: new Date("2020-01-01T00:00:00.000Z"),
        },
      },
    });

    await expect(requireSession()).rejects.toMatchObject({
      status: 403,
      code: "PAYMENT_REQUIRED",
    });
    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "student-1" },
      })
    );
  });

  it("allows due-today students and includes derived access fields", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "student-2",
        role: "STUDENT",
      },
    });

    findUniqueMock.mockResolvedValue({
      id: "student-2",
      role: "STUDENT",
      studentProfile: {
        id: "profile-2",
        trainerId: "trainer-1",
        status: "ACTIVE",
        currentPayment: {
          dueDate: new Date(),
        },
      },
    });

    const result = await requireSession();

    expect(result).toMatchObject({
      id: "student-2",
      paymentStatus: "CURRENT",
      accessBlockReason: undefined,
    });
  });
});
