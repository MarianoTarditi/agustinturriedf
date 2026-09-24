import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMock, findManyMock, requireSessionMock, transactionMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findManyMock: vi.fn(),
  requireSessionMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: findManyMock }, $transaction: transactionMock },
}));

vi.mock("@/features/auth/session", () => ({ requireSession: requireSessionMock }));

import { GET } from "@/app/api/users/route";
import { userRepository } from "@/features/users/repository";
import { userService } from "@/features/users/service";

const user = {
  id: "student-1",
  firstName: "Ana",
  lastName: "Student",
  email: "ana@example.com",
  phone: null,
  photoUrl: null,
  birthDate: null,
  gender: null,
  heightCm: null,
  weightKg: null,
  role: "STUDENT" as const,
  status: "ACTIVE" as const,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  passwordHash: "secret-hash",
  authVersion: 9,
  archivedAt: null,
  archiveReason: null,
  studentProfile: { id: "profile-1", trainerId: null, status: "ACTIVE" as const, routinePath: "/private/path" },
};

describe("user directory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists an unassigned student profile with a null trainerId", async () => {
    const createdStudent = { ...user, studentProfile: { id: "profile-1", trainerId: null, status: "ACTIVE" } };
    createMock.mockResolvedValue(createdStudent);
    transactionMock.mockImplementation(async (callback) => callback({ user: { create: createMock } }));

    await expect(
      userRepository.create({
        firstName: "Ana",
        lastName: "Student",
        email: "ana@example.com",
        passwordHash: "hash",
        role: "STUDENT",
        studentProfile: { trainerId: null },
      })
    ).resolves.toMatchObject({ studentProfile: { trainerId: null } });

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ studentProfile: { create: { status: "ACTIVE" } } }),
    }));
  });

  it("persists the trainer student-only scope and returns a secret-safe summary page", async () => {
    process.env.NEXTAUTH_SECRET = "directory-test-secret";
    findManyMock.mockResolvedValue([user, { ...user, id: "student-2" }]);

    const page = await userService.listDirectory(
      { id: "trainer-1", role: "TRAINER" },
      { view: "students", limit: 25, sort: "createdAt:desc" }
    );

    expect(page.items[0]).toMatchObject({
      id: "student-1",
      role: "STUDENT",
      studentProfile: expect.objectContaining({ trainerId: null, status: "ACTIVE" }),
    });
    expect(page.nextCursor).toBeNull();

    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({
      take: 26,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      where: expect.objectContaining({ role: { in: ["STUDENT"] }, status: { not: "ARCHIVED" } }),
    }));
    expect((await userService.listDirectory({ id: "trainer-1", role: "TRAINER" }, { view: "students", limit: 25, sort: "createdAt:desc" })).items[0]).not.toHaveProperty("passwordHash");
  });

  it("separates team from student queries and rejects trainer team access before querying", async () => {
    await expect(
      userService.listDirectory({ id: "trainer-1", role: "TRAINER" }, { view: "team", limit: 25, sort: "createdAt:desc" })
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });

    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("uses a signed cursor bound to its scope and stable ordering", async () => {
    process.env.NEXTAUTH_SECRET = "directory-test-secret";
    findManyMock.mockResolvedValueOnce([user, { ...user, id: "student-2" }]).mockResolvedValueOnce([user]);

    const firstPage = await userService.listDirectory(
      { id: "admin-1", role: "ADMIN" },
      { view: "students", limit: 1, sort: "createdAt:asc" }
    );
    await userService.listDirectory(
      { id: "admin-1", role: "ADMIN" },
      { view: "students", limit: 1, sort: "createdAt:asc", cursor: firstPage.nextCursor ?? undefined }
    );

    expect(firstPage.nextCursor).toContain(".");
    expect(findManyMock.mock.calls[1][0].where.AND[0].OR).toEqual([
      { createdAt: { gt: new Date("2026-01-01T00:00:00.000Z") } },
      { createdAt: new Date("2026-01-01T00:00:00.000Z"), id: { gt: "student-1" } },
    ]);
    await expect(
      userService.listDirectory(
        { id: "admin-1", role: "ADMIN" },
        { view: "students", limit: 1, sort: "createdAt:desc", cursor: firstPage.nextCursor ?? undefined }
      )
    ).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
  });

  it("rejects invalid query input before calling the directory service", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    const listDirectorySpy = vi.spyOn(userService, "listDirectory");

    const response = await GET(new Request("http://localhost/api/users?view=unknown&limit=101"));

    expect(response.status).toBe(400);
    expect(listDirectorySpy).not.toHaveBeenCalled();
  });

  it("passes allowlisted filters, ordering, and cursor through the GET boundary", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    const listDirectorySpy = vi.spyOn(userService, "listDirectory").mockResolvedValue({ items: [], nextCursor: null });

    const response = await GET(
      new Request("http://localhost/api/users?view=students&search=ana&status=ACTIVE&trainerId=c123456789012345678901234&sort=createdAt:asc&limit=2&cursor=signed")
    );

    expect(response.status).toBe(200);
    expect(listDirectorySpy).toHaveBeenCalledWith(
      { id: "admin-1", role: "ADMIN" },
      expect.objectContaining({ view: "students", search: "ana", status: "ACTIVE", trainerId: "c123456789012345678901234", sort: "createdAt:asc", limit: 2, cursor: "signed" })
    );
  });
});
