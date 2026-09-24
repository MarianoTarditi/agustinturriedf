import { beforeEach, describe, expect, it, vi } from "vitest";

const { appendMock, createMock, findManyMock, findUniqueMock, requireSessionMock, transactionMock, updateManyMock, updateProfileMock, advisoryLockMock } = vi.hoisted(() => ({
  appendMock: vi.fn(),
  createMock: vi.fn(),
  findManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
  requireSessionMock: vi.fn(),
  transactionMock: vi.fn(),
  updateManyMock: vi.fn(),
  updateProfileMock: vi.fn(),
  advisoryLockMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: findManyMock }, $transaction: transactionMock },
}));

vi.mock("@/features/auth/session", () => ({ requireSession: requireSessionMock }));
vi.mock("@/features/audit/repository", () => ({ auditRepository: { append: appendMock } }));

import { GET } from "@/app/api/users/route";
import { PATCH as patchUser } from "@/app/api/users/[userId]/route";
import { PATCH as patchAssignment } from "@/app/api/users/[userId]/assignment/route";
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

  it.each([
    ["missing expectedVersion", { firstName: "Changed" }],
    ["role", { firstName: "Changed", expectedVersion: 1, role: "ADMIN" }],
    ["password", { firstName: "Changed", expectedVersion: 1, password: "not-allowed" }],
    ["lifecycle", { firstName: "Changed", expectedVersion: 1, status: "BLOCKED" }],
    ["audit", { firstName: "Changed", expectedVersion: 1, auditReason: "not-allowed" }],
    ["server version", { firstName: "Changed", expectedVersion: 1, version: 2 }],
    ["trainer assignment", { expectedVersion: 1, trainerId: "c123456789012345678901234" }],
  ])("rejects %s mutation payloads at the PATCH boundary", async (_case, payload) => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    const updateSpy = vi.spyOn(userService, "updateUser");

    const response = await patchUser(
      new Request("http://localhost/api/users/student-1", { method: "PATCH", body: JSON.stringify(payload) }),
      { params: Promise.resolve({ userId: "student-1" }) }
    );

    expect(response.status).toBe(400);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("uses one transactional CAS mutation and audit event for profile edits", async () => {
    const updatedUser = { ...user, firstName: "Ana María", version: 2 };
    findUniqueMock.mockResolvedValueOnce({ ...user, version: 1 }).mockResolvedValueOnce(updatedUser);
    updateManyMock.mockResolvedValue({ count: 1 });
    transactionMock.mockImplementation(async (callback) => callback({
      user: { findUnique: findUniqueMock, updateMany: updateManyMock },
    }));

    await expect(userRepository.update("student-1", {
      firstName: "Ana María", expectedVersion: 1, actorId: "admin-1",
    })).resolves.toEqual(updatedUser);

    expect(updateManyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "student-1", version: 1 },
      data: expect.objectContaining({ firstName: "Ana María", version: { increment: 1 } }),
    }));
    expect(appendMock).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "USER_PROFILE_UPDATED", subjectUserId: "student-1", actorUserId: "admin-1",
    }), expect.anything());
  });

  it("rejects lost profile updates before audit side effects", async () => {
    findUniqueMock.mockResolvedValueOnce({ ...user, version: 2 });
    updateManyMock.mockResolvedValue({ count: 0 });
    transactionMock.mockImplementation(async (callback) => callback({
      user: { findUnique: findUniqueMock, updateMany: updateManyMock },
    }));

    await expect(userRepository.update("student-1", {
      firstName: "Changed", expectedVersion: 1, actorId: "admin-1",
    })).rejects.toMatchObject({ status: 409, code: "VERSION_CONFLICT" });

    expect(appendMock).not.toHaveBeenCalled();
  });

  it("assigns only an active trainer under the shared advisory lock with CAS and audit", async () => {
    const updatedUser = { ...user, version: 2, studentProfile: { ...user.studentProfile, trainerId: "trainer-1" } };
    findUniqueMock.mockResolvedValueOnce(user).mockResolvedValueOnce({ id: "trainer-1", role: "TRAINER", status: "ACTIVE" }).mockResolvedValueOnce(updatedUser);
    updateManyMock.mockResolvedValue({ count: 1 });
    updateProfileMock.mockResolvedValue({ ...user.studentProfile, trainerId: "trainer-1" });
    transactionMock.mockImplementation(async (callback) => callback({
      $executeRaw: advisoryLockMock,
      user: { findUnique: findUniqueMock, updateMany: updateManyMock },
      studentProfile: { update: updateProfileMock },
    }));

    await expect(userRepository.assignTrainer({ userId: "student-1", trainerId: "trainer-1", expectedVersion: 1, actorId: "admin-1" })).resolves.toEqual(updatedUser);

    expect(advisoryLockMock).toHaveBeenCalled();
    expect(updateManyMock).toHaveBeenCalledWith({ where: { id: "student-1", version: 1 }, data: { version: { increment: 1 } } });
    expect(updateProfileMock).toHaveBeenCalledWith({ where: { id: "profile-1" }, data: { trainerId: "trainer-1" } });
    expect(appendMock).toHaveBeenCalledWith(expect.objectContaining({ eventType: "STUDENT_TRAINER_ASSIGNED", subjectUserId: "student-1" }), expect.anything());
  });

  it.each([null, { id: "trainer-1", role: "ADMIN", status: "ACTIVE" }, { id: "trainer-1", role: "TRAINER", status: "INACTIVE" }])("rejects an ineligible assignment destination without a student mutation", async (trainer) => {
    findUniqueMock.mockResolvedValueOnce(user).mockResolvedValueOnce(trainer);
    transactionMock.mockImplementation(async (callback) => callback({ $executeRaw: advisoryLockMock, user: { findUnique: findUniqueMock, updateMany: updateManyMock } }));

    await expect(userRepository.assignTrainer({ userId: "student-1", trainerId: "trainer-1", expectedVersion: 1, actorId: "admin-1" })).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
    expect(updateManyMock).not.toHaveBeenCalled();
    expect(appendMock).not.toHaveBeenCalled();
  });

  it("rejects stale assignment CAS before profile or audit side effects", async () => {
    findUniqueMock.mockResolvedValueOnce(user).mockResolvedValueOnce({ id: "trainer-1", role: "TRAINER", status: "ACTIVE" });
    updateManyMock.mockResolvedValue({ count: 0 });
    transactionMock.mockImplementation(async (callback) => callback({ $executeRaw: advisoryLockMock, user: { findUnique: findUniqueMock, updateMany: updateManyMock } }));

    await expect(userRepository.assignTrainer({ userId: "student-1", trainerId: "trainer-1", expectedVersion: 1, actorId: "admin-1" })).rejects.toMatchObject({ status: 409, code: "VERSION_CONFLICT" });
    expect(updateProfileMock).not.toHaveBeenCalled();
    expect(appendMock).not.toHaveBeenCalled();
  });

  it("rolls back assignment when its atomic audit append fails", async () => {
    let committedTrainerId: string | null = null;
    let stagedTrainerId: string | null = committedTrainerId;
    findUniqueMock.mockResolvedValueOnce(user).mockResolvedValueOnce({ id: "trainer-1", role: "TRAINER", status: "ACTIVE" });
    updateManyMock.mockResolvedValue({ count: 1 });
    updateProfileMock.mockImplementation(async ({ data }) => { stagedTrainerId = data.trainerId; });
    appendMock.mockRejectedValue(new Error("audit unavailable"));
    transactionMock.mockImplementation(async (callback) => {
      stagedTrainerId = committedTrainerId;
      await callback({ $executeRaw: advisoryLockMock, user: { findUnique: findUniqueMock, updateMany: updateManyMock }, studentProfile: { update: updateProfileMock } });
      committedTrainerId = stagedTrainerId;
    });

    await expect(userRepository.assignTrainer({ userId: "student-1", trainerId: "trainer-1", expectedVersion: 1, actorId: "admin-1" })).rejects.toThrow("audit unavailable");
    expect(committedTrainerId).toBeNull();
  });

  it("validates the assignment route before calling the service", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    const assignSpy = vi.spyOn(userService, "assignTrainer");

    const response = await patchAssignment(
      new Request("http://localhost/api/users/student-1/assignment", { method: "PATCH", body: JSON.stringify({ trainerId: "bad", expectedVersion: 1 }) }),
      { params: Promise.resolve({ userId: "student-1" }) }
    );

    expect(response.status).toBe(400);
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("rolls back a successful CAS when the audit append fails", async () => {
    let committedName = user.firstName;
    let stagedName = committedName;
    findUniqueMock.mockResolvedValue({ ...user, version: 1 });
    updateManyMock.mockImplementation(async ({ data }) => {
      stagedName = data.firstName;
      return { count: 1 };
    });
    appendMock.mockRejectedValue(new Error("audit unavailable"));
    transactionMock.mockImplementation(async (callback) => {
      stagedName = committedName;
      await callback({
        user: { findUnique: findUniqueMock, updateMany: updateManyMock },
      });
      committedName = stagedName;
    });

    await expect(userRepository.update("student-1", {
      firstName: "Changed", expectedVersion: 1, actorId: "admin-1",
    })).rejects.toThrow("audit unavailable");

    expect(committedName).toBe("Ana");
  });
});
