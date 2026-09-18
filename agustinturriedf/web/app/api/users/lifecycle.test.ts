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
    };
    const result = await callback(transaction);
    committedUsers = stagedUsers;
    return result;
  });

  return () => committedUsers;
};

describe("UserRepository.transition", () => {
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
});
