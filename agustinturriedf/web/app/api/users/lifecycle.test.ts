import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/http/api-response";

const { requireSessionMock, transitionMock, prismaMock, appendMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  transitionMock: vi.fn(),
  prismaMock: { $transaction: vi.fn() },
  appendMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/features/users/service", () => ({
  userService: {
    transitionUser: transitionMock,
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/features/audit/repository", () => ({ auditRepository: { append: appendMock } }));

import { DELETE, PATCH } from "@/app/api/users/[userId]/transitions/route";
import { DELETE as deleteUser } from "@/app/api/users/[userId]/route";
import { UserRepository } from "@/features/users/repository";

const context = {
  params: Promise.resolve({ userId: "ck7m7x3k50000abcd1234efgh" }),
};

const transitionRequest = (payload: Record<string, unknown>) =>
  new Request("http://localhost/api/users/ck7m7x3k50000abcd1234efgh/transitions", {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

describe("PATCH /api/users/:userId/transitions", () => {
  it("keeps physical deletion disabled with a JSON error", async () => {
    const response = await deleteUser(new Request("http://localhost/api/users/u", { method: "DELETE" }), context);
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, PATCH");
    await expect(response.json()).resolves.toMatchObject({ success: false, error: { code: "PHYSICAL_DELETE_DISABLED" } });
    expect(transitionMock).not.toHaveBeenCalled();
  });

  it("accepts archive with a trimmed reason and actual version", async () => {
    transitionMock.mockResolvedValue({ status: "ARCHIVED", version: 8 });
    const response = await PATCH(transitionRequest({ targetStatus: "ARCHIVED", expectedVersion: 7, reason: "  Closure  " }), context);
    expect(response.status).toBe(200);
    expect(transitionMock).toHaveBeenCalledWith(expect.anything(), expect.anything(), { targetStatus: "ARCHIVED", expectedVersion: 7, reason: "Closure" });
  });
  beforeEach(() => {
    vi.clearAllMocks();
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  });

  it("applies a reasoned lifecycle transition with the caller's expected version", async () => {
    transitionMock.mockResolvedValue({
      id: "ck7m7x3k50000abcd1234efgh",
      status: "INACTIVE",
      version: 8,
      authVersion: 4,
    });

    const response = await PATCH(
      transitionRequest({ targetStatus: "INACTIVE", expectedVersion: 7, reason: "Membership paused" }),
      context
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        id: "ck7m7x3k50000abcd1234efgh",
        status: "INACTIVE",
        version: 8,
        authVersion: 4,
      },
    });
    expect(transitionMock).toHaveBeenCalledWith(
      { id: "admin-1", role: "ADMIN" },
      "ck7m7x3k50000abcd1234efgh",
      { targetStatus: "INACTIVE", expectedVersion: 7, reason: "Membership paused" }
    );
  });

  it("rejects blank reasons before a lifecycle mutation", async () => {
    const response = await PATCH(
      transitionRequest({ targetStatus: "BLOCKED", expectedVersion: 7, reason: "   " }),
      context
    );

    expect(response.status).toBe(400);
    expect(transitionMock).not.toHaveBeenCalled();
  });

  it("rejects reasons longer than 500 characters before a lifecycle mutation", async () => {
    const response = await PATCH(
      transitionRequest({ targetStatus: "BLOCKED", expectedVersion: 7, reason: "x".repeat(501) }),
      context
    );

    expect(response.status).toBe(400);
    expect(transitionMock).not.toHaveBeenCalled();
  });

  it("returns ARCHIVED accounts as INACTIVE only after restore", async () => {
    transitionMock.mockResolvedValue({
      id: "ck7m7x3k50000abcd1234efgh",
      status: "INACTIVE",
      version: 12,
      authVersion: 5,
    });

    const response = await PATCH(
      transitionRequest({ targetStatus: "INACTIVE", expectedVersion: 11, reason: "Restore archived account" }),
      context
    );

    expect(response.status).toBe(200);
    expect(transitionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ targetStatus: "INACTIVE", reason: "Restore archived account" })
    );
    await expect(response.json()).resolves.toMatchObject({ data: { status: "INACTIVE" } });
  });

  it("returns LAST_ACTIVE_ADMIN when a concurrent admin transition would remove the survivor", async () => {
    transitionMock.mockRejectedValue(
      new ApiError("At least one active administrator must remain", 409, "LAST_ACTIVE_ADMIN")
    );

    const response = await PATCH(
      transitionRequest({ targetStatus: "ARCHIVED", expectedVersion: 3, reason: "Account closure" }),
      context
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "LAST_ACTIVE_ADMIN" },
    });
  });
});

describe("DELETE /api/users/:userId/transitions", () => {
  it("is forbidden because lifecycle accounts are never physically deleted", async () => {
    const response = await DELETE();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("PATCH");
  });
});

const createLifecycleHarness = (initialUsers: Array<Record<string, unknown>>) => {
  let committedUsers = structuredClone(initialUsers);

  prismaMock.$transaction.mockImplementation(async (callback: (transaction: any) => Promise<unknown>) => {
    const stagedUsers = structuredClone(committedUsers);
    const transaction = {
      $executeRaw: vi.fn(),
      user: {
        findUnique: vi.fn(async ({ where }: any) => stagedUsers.find((user) => user.id === where.id) ?? null),
        count: vi.fn(async ({ where }: any) => stagedUsers.filter((user) => user.role === where.role && user.status === where.status).length),
        updateMany: vi.fn(async ({ where, data }: any) => {
          const user = stagedUsers.find((item) => item.id === where.id && item.version === where.version && item.status === where.status);
          if (!user) return { count: 0 };
          Object.assign(user, {
            ...data,
            version: user.version + data.version.increment,
            authVersion: user.authVersion + data.authVersion.increment,
          });
          return { count: 1 };
        }),
      },
      studentProfile: {
        update: vi.fn(async ({ where, data }: any) => {
          const user = stagedUsers.find((item) => (item.studentProfile as { id?: string } | null)?.id === where.id);
          if (user?.studentProfile) Object.assign(user.studentProfile as object, data);
        }),
        updateMany: vi.fn(async ({ where, data }: any) => {
          stagedUsers.filter((user) => (user.studentProfile as { trainerId?: string } | null)?.trainerId === where.trainerId).forEach((user) => {
            (user.studentProfile as { trainerId: string | null }).trainerId = data.trainerId;
          });
        }),
      },
    };
    const result = await callback(transaction);
    committedUsers = stagedUsers;
    return result;
  });

  return () => committedUsers;
};

const createAdvisoryLockHarness = (initialUsers: Array<Record<string, any>>) => {
  const users = structuredClone(initialUsers);
  const waiters: Array<() => void> = [];
  let locked = false;
  let contended = 0;
  const acquire = async () => {
    if (locked) {
      contended += 1;
      await new Promise<void>((resolve) => waiters.push(resolve));
    }
    locked = true;
  };
  const release = () => {
    locked = false;
    waiters.shift()?.();
  };
  prismaMock.$transaction.mockImplementation(async (callback: (transaction: any) => Promise<unknown>) => {
    let ownsLock = false;
    const transaction = {
      $executeRaw: async () => { await acquire(); ownsLock = true; },
      user: {
        findUnique: async ({ where }: any) => structuredClone(users.find((user) => user.id === where.id) ?? null),
        count: async ({ where }: any) => users.filter((user) => user.role === where.role && user.status === where.status).length,
        updateMany: async ({ where, data }: any) => {
          const user = users.find((item) => item.id === where.id && item.version === where.version && (!where.status || item.status === where.status));
          if (!user) return { count: 0 };
          Object.assign(user, data, { version: user.version + data.version.increment });
          if (data.authVersion) user.authVersion += data.authVersion.increment;
          return { count: 1 };
        },
      },
      studentProfile: {
        update: async ({ where, data }: any) => {
          const user = users.find((item) => item.studentProfile?.id === where.id);
          if (user?.studentProfile) Object.assign(user.studentProfile, data);
        },
        updateMany: async ({ where, data }: any) => users.filter((user) => user.studentProfile?.trainerId === where.trainerId).forEach((user) => Object.assign(user.studentProfile, data)),
      },
    };
    try { return await callback(transaction); } finally { if (ownsLock) release(); }
  });
  return { users, contention: () => contended };
};

describe("UserRepository.transition", () => {
  it("archives an active student without physical deletion", async () => {
    const users = createLifecycleHarness([{ id: "student-1", role: "STUDENT", status: "ACTIVE", version: 7, authVersion: 2, studentProfile: null }]);
    await new UserRepository().transition({ userId: "student-1", actorId: "admin-1", targetStatus: "ARCHIVED", expectedVersion: 7, reason: "Closure" });
    expect(users()).toHaveLength(1);
    expect(users()[0]).toMatchObject({ status: "ARCHIVED", version: 8, authVersion: 3, archiveReason: "Closure", archivedByUserId: "admin-1" });
    expect(appendMock).toHaveBeenCalledWith(expect.objectContaining({ eventType: "ACCOUNT_ARCHIVED", reason: "Closure" }), expect.anything());
  });
  beforeEach(() => {
    vi.clearAllMocks();
    appendMock.mockResolvedValue({ id: "audit-1" });
  });

  it("serializes concurrent administrator departures so one active administrator survives", async () => {
    const users = createLifecycleHarness([
      { id: "admin-1", role: "ADMIN", status: "ACTIVE", version: 1, authVersion: 1, studentProfile: null },
      { id: "admin-2", role: "ADMIN", status: "ACTIVE", version: 1, authVersion: 1, studentProfile: null },
    ]);
    const repository = new UserRepository();

    await repository.transition({ userId: "admin-1", actorId: "admin-2", targetStatus: "INACTIVE", expectedVersion: 1, reason: "Pause" });
    await expect(
      repository.transition({ userId: "admin-2", actorId: "admin-1", targetStatus: "INACTIVE", expectedVersion: 1, reason: "Pause" })
    ).rejects.toMatchObject({ code: "LAST_ACTIVE_ADMIN" });

    expect(users().filter((user) => user.status === "ACTIVE" && user.role === "ADMIN")).toHaveLength(1);
    expect(appendMock).toHaveBeenCalledWith(expect.objectContaining({ summary: { fromStatus: "ACTIVE", toStatus: "INACTIVE" } }), expect.anything());
  });

  it("rolls back a lifecycle mutation when its audit append fails", async () => {
    const users = createLifecycleHarness([
      { id: "student-1", role: "STUDENT", status: "ARCHIVED", version: 4, authVersion: 2, studentProfile: null, archivedAt: "old", archivedByUserId: "admin-1", archiveReason: "Old" },
    ]);
    appendMock.mockRejectedValue(new Error("audit unavailable"));

    await expect(
      new UserRepository().transition({ userId: "student-1", actorId: "admin-1", targetStatus: "INACTIVE", expectedVersion: 4, reason: "Restore" })
    ).rejects.toThrow("audit unavailable");

    expect(users()[0]).toMatchObject({ status: "ARCHIVED", version: 4, authVersion: 2, archiveReason: "Old" });
  });

  it.each(["assignment", "deactivation"] as const)("serializes %s lock winner without an inactive trainer assignment", async (winner) => {
    const harness = createAdvisoryLockHarness([
      { id: "trainer-1", role: "TRAINER", status: "ACTIVE", version: 1, authVersion: 1, studentProfile: null },
      { id: "student-1", role: "STUDENT", status: "ACTIVE", version: 1, authVersion: 1, studentProfile: { id: "profile-1", trainerId: "trainer-1" } },
    ]);
    const repository = new UserRepository();
    let releaseFirst!: () => void;
    const firstAudit = new Promise<void>((resolve) => { releaseFirst = resolve; });
    let firstAuditReached!: () => void;
    const reached = new Promise<void>((resolve) => { firstAuditReached = resolve; });
    appendMock.mockImplementation(async () => { firstAuditReached(); await firstAudit; });
    const assignment = () => repository.assignTrainer({ userId: "student-1", trainerId: "trainer-1", expectedVersion: 1, actorId: "admin-1" });
    const deactivation = () => repository.transition({ userId: "trainer-1", actorId: "admin-1", targetStatus: "INACTIVE", expectedVersion: 1, reason: "Leave" });
    const first = winner === "assignment" ? assignment() : deactivation();
    await reached;
    const second = winner === "assignment" ? deactivation() : assignment();
    await new Promise((resolve) => setTimeout(resolve, 0));
    releaseFirst();
    if (winner === "assignment") await Promise.all([first, second]);
    else await expect(second).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    if (winner !== "assignment") await first;

    expect(harness.contention()).toBe(1);
    expect(harness.users[0]).toMatchObject({ status: "INACTIVE" });
    expect(harness.users[1].studentProfile.trainerId).toBeNull();
    expect(appendMock).toHaveBeenCalledTimes(winner === "assignment" ? 2 : 1);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
  });
});
