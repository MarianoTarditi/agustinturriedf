import { beforeEach, describe, expect, it, vi } from "vitest";

type UserRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  passwordHash: string;
  passwordUpdatedAt: Date | null;
  authVersion: number;
  role: "ADMIN";
  status: "ACTIVE";
};

type PasswordResetTokenRecord = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

const {
  hashMock,
  compareMock,
  nextAuthMock,
  resetState,
  prismaMock,
  getLatestTokenRecord,
  getLatestOutboxMessage,
  getUserById,
  getAuditEvents,
  setFailure,
  expireToken,
  holdHash,
  consoleInfoMock,
} = vi.hoisted(() => {
  let usersById = new Map<string, UserRecord>();
  const userIdsByEmail = new Map<string, string>();
  let tokenByUserId = new Map<string, PasswordResetTokenRecord>();
  let outboxMessages: any[] = [];
  let auditEvents: any[] = [];
  let failure: "audit" | "outbox" | "user" | null = null;
  let transactionTail = Promise.resolve();
  let hashGate: Promise<void> | null = null;
  const consoleInfoMock = vi.fn();

  const resetState = () => {
    usersById.clear();
    userIdsByEmail.clear();
    tokenByUserId.clear();
    outboxMessages = [];
    auditEvents = [];
    failure = null;
    transactionTail = Promise.resolve();
    hashGate = null;

    const user: UserRecord = {
      id: "user-1",
      email: "user@example.com",
      firstName: "Test",
      lastName: "User",
      photoUrl: null,
      passwordHash: "old-password-hash",
      passwordUpdatedAt: null,
      authVersion: 1,
      role: "ADMIN",
      status: "ACTIVE",
    };

    usersById.set(user.id, user);
    userIdsByEmail.set(user.email, user.id);
  };

  const getUserById = (id: string) => usersById.get(id) ?? null;

  const getLatestTokenRecord = (userId: string) => tokenByUserId.get(userId) ?? null;

  const userFindUnique = vi.fn(async (args: any) => {
    if (args?.where?.email) {
      const normalizedEmail = String(args.where.email).toLowerCase().trim();
      const userId = userIdsByEmail.get(normalizedEmail);

      if (!userId) {
        return null;
      }

      const user = usersById.get(userId);
      if (!user) {
        return null;
      }

      if (args.select?.id || args.select?.email) {
        return {
          id: user.id,
          email: user.email,
        };
      }

      return user;
    }

    if (args?.where?.id) {
      const user = usersById.get(String(args.where.id));

      if (!user) {
        return null;
      }

      if (args.select?.passwordUpdatedAt) {
        return {
          passwordUpdatedAt: user.passwordUpdatedAt,
          status: user.status,
        };
      }

      return user;
    }

    return null;
  });

  const passwordResetTokenUpsert = vi.fn(async (args: any) => {
    const nextRecord: PasswordResetTokenRecord = {
      userId: String(args.where.userId),
      tokenHash: String(args.update.tokenHash),
      expiresAt: args.update.expiresAt as Date,
    };

    tokenByUserId.set(nextRecord.userId, nextRecord);
    return nextRecord;
  });

  const passwordResetTokenFindUnique = vi.fn(async (args: any) => {
    const searchedHash = String(args.where.tokenHash);

    for (const tokenRecord of tokenByUserId.values()) {
      if (tokenRecord.tokenHash === searchedHash) {
        return {
          userId: tokenRecord.userId,
          expiresAt: tokenRecord.expiresAt,
        };
      }
    }

    return null;
  });

  const passwordResetTokenDeleteMany = vi.fn(async () => ({ count: 0 }));

  const prismaMock = {
    user: {
      findUnique: userFindUnique,
    },
    passwordResetToken: {
      upsert: passwordResetTokenUpsert,
      findUnique: passwordResetTokenFindUnique,
      deleteMany: passwordResetTokenDeleteMany,
    },
    $transaction: async (callback: (transaction: any) => Promise<unknown>) => {
      const previous = transactionTail;
      let release: () => void = () => {};
      transactionTail = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      const stagedUsers = new Map([...usersById].map(([id, user]) => [id, { ...user }]));
      const stagedTokens = new Map([...tokenByUserId].map(([id, token]) => [id, { ...token }]));
      const stagedOutbox = [...outboxMessages];
      const stagedAudit = [...auditEvents];
      const transaction = {
        user: { update: async (args: any) => {
          if (failure === "user") throw new Error("user update failed");
          const user = stagedUsers.get(String(args.where.id));
          if (!user) throw new Error("User not found in test state");
          user.passwordHash = String(args.data.passwordHash);
          user.passwordUpdatedAt = args.data.passwordUpdatedAt as Date;
          user.authVersion += Number(args.data.authVersion?.increment ?? 0);
          return user;
        } },
        passwordResetToken: {
          upsert: async (args: any) => {
            const token = { userId: String(args.where.userId), tokenHash: String(args.update.tokenHash), expiresAt: args.update.expiresAt as Date };
            stagedTokens.set(token.userId, token);
            return token;
          },
          deleteMany: async (args: any) => {
            const token = stagedTokens.get(String(args.where.userId));
            const current = token && token.tokenHash === args.where.tokenHash && token.expiresAt > args.where.expiresAt.gt;
            if (current) stagedTokens.delete(token.userId);
            return { count: current ? 1 : 0 };
          },
        },
        auditEvent: { create: async (args: any) => {
          if (failure === "audit") throw new Error("audit failed");
          stagedAudit.push(args.data);
          return args.data;
        } },
        outboxMessage: { create: async (args: any) => {
          if (failure === "outbox") throw new Error("outbox failed");
          stagedOutbox.push(args.data);
          return args.data;
        } },
      };
      try {
        const result = await callback(transaction);
        usersById = stagedUsers;
        tokenByUserId = stagedTokens;
        outboxMessages = stagedOutbox;
        auditEvents = stagedAudit;
        return result;
      } finally {
        release();
      }
    },
  };

  return {
    hashMock: vi.fn(async (password: string) => {
      await hashGate;
      return `hashed:${password}`;
    }),
    compareMock: vi.fn(async (password: string, passwordHash: string) => passwordHash === `hashed:${password}`),
    nextAuthMock: vi.fn(() => ({
      handlers: {},
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })),
    resetState,
    prismaMock,
    getLatestTokenRecord,
    getLatestOutboxMessage: () => outboxMessages.at(-1) ?? null,
    getUserById,
    getAuditEvents: () => auditEvents,
    setFailure: (value: typeof failure) => { failure = value; },
    expireToken: () => {
      const token = tokenByUserId.get("user-1");
      if (token) token.expiresAt = new Date(0);
    },
    holdHash: () => {
      let release = () => {};
      hashGate = new Promise<void>((resolve) => { release = resolve; });
      return release;
    },
    consoleInfoMock,
  };
});

vi.mock("bcryptjs", () => ({
  hash: hashMock,
  compare: compareMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("next-auth", () => ({
  default: nextAuthMock,
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: (config: unknown) => config,
}));

import { POST as confirmPasswordReset } from "@/app/api/password-reset/confirm/route";
import { PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE } from "@/app/api/password-reset/contract";
import { POST as requestPasswordReset } from "@/app/api/password-reset/request/route";
import { authConfig } from "@/auth";
import { authorizeCredentials } from "@/features/auth/credentials";
import { decryptPayload } from "@/features/outbox/crypto";

const outboxKey = { id: "test", value: Buffer.alloc(32, 1).toString("base64url") };
const getDeliveredToken = () => {
  const message = getLatestOutboxMessage();
  const payload = decryptPayload<{ activationUrl: string }>(message.payloadEncrypted, outboxKey);
  return new URL(payload.activationUrl).searchParams.get("token");
};

describe("password reset integrated flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetState();
    vi.spyOn(console, "info").mockImplementation(consoleInfoMock);
    process.env.OUTBOX_ENCRYPTION_KEY = outboxKey.value;
    process.env.OUTBOX_ENCRYPTION_KEY_ID = outboxKey.id;
  });

  it("executes request -> confirm -> single-use token -> session invalidation", async () => {
    const requestResponse = await requestPasswordReset(
      new Request("http://localhost/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      })
    );

    expect(requestResponse.status).toBe(200);
    await expect(requestResponse.json()).resolves.toEqual({
      success: true,
      data: {
        message: PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
      },
    });

    expect(consoleInfoMock).toHaveBeenCalledWith({ event: "password_reset_queued", userId: "user-1" });
    const firstToken = getDeliveredToken();
    expect(typeof firstToken).toBe("string");
    expect(firstToken?.length).toBeGreaterThan(0);

    const firstStoredToken = getLatestTokenRecord("user-1");
    expect(firstStoredToken).toBeDefined();

    const expiresInMs = firstStoredToken!.expiresAt.getTime() - Date.now();
    expect(expiresInMs).toBeGreaterThanOrEqual(29 * 60 * 1000);
    expect(expiresInMs).toBeLessThanOrEqual(31 * 60 * 1000);

    await requestPasswordReset(
      new Request("http://localhost/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      })
    );

    const secondToken = getDeliveredToken();

    expect(secondToken).toBeTruthy();
    expect(secondToken).not.toBe(firstToken);

    const replacedTokenResponse = await confirmPasswordReset(
      new Request("http://localhost/api/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: firstToken,
          password: "new-password-123",
          confirmPassword: "new-password-123",
        }),
      })
    );

    expect(replacedTokenResponse.status).toBe(400);
    await expect(replacedTokenResponse.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "INVALID_OR_EXPIRED_TOKEN",
      },
    });

    const replaceResponse = await confirmPasswordReset(
      new Request("http://localhost/api/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: secondToken,
          password: "new-password-123",
          confirmPassword: "new-password-123",
        }),
      })
    );

    expect(replaceResponse.status).toBe(200);

    const consumedTokenRetry = await confirmPasswordReset(
      new Request("http://localhost/api/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: secondToken,
          password: "new-password-123",
          confirmPassword: "new-password-123",
        }),
      })
    );

    expect(consumedTokenRetry.status).toBe(400);
    await expect(consumedTokenRetry.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "INVALID_OR_EXPIRED_TOKEN",
      },
    });

    const updatedUser = getUserById("user-1");
    expect(updatedUser?.passwordHash).toBe("hashed:new-password-123");
    expect(updatedUser?.passwordUpdatedAt).toBeInstanceOf(Date);

    const passwordUpdatedAtMs = updatedUser!.passwordUpdatedAt!.getTime();
    const jwtCallback = authConfig.callbacks?.jwt;

    const staleSessionResult = await jwtCallback?.({
      token: {
        sub: "user-1",
        iat: Math.floor((passwordUpdatedAtMs - 1000) / 1000),
      },
      user: undefined,
    } as never);

    expect(staleSessionResult).toBeNull();

    const freshSessionToken = {
      sub: "user-1",
      iat: Math.floor((passwordUpdatedAtMs + 1000) / 1000),
    };

    const freshSessionResult = await jwtCallback?.({
      token: freshSessionToken,
      user: undefined,
    } as never);

    expect(freshSessionResult).toEqual(
      expect.objectContaining({
        sub: "user-1",
      })
    );
  });

  it("returns generic response for missing email without creating token", async () => {
    const existingResponse = await requestPasswordReset(
      new Request("http://localhost/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      })
    );

    const missingResponse = await requestPasswordReset(
      new Request("http://localhost/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "missing@example.com" }),
      })
    );

    await expect(existingResponse.json()).resolves.toEqual({
      success: true,
      data: {
        message: PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
      },
    });
    await expect(missingResponse.json()).resolves.toEqual({
      success: true,
      data: {
        message: PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
      },
    });

    expect(consoleInfoMock).toHaveBeenCalledTimes(1);
  });

  it.each(["audit", "outbox"] as const)("rolls back reset issuance when %s persistence fails", async (failedWrite) => {
    setFailure(failedWrite);
    const response = await requestPasswordReset(new Request("http://localhost/api/password-reset/request", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "user@example.com" }),
    }));

    expect(response.status).toBe(500);
    expect(getLatestTokenRecord("user-1")).toBeNull();
    expect(getLatestOutboxMessage()).toBeNull();
    expect(getAuditEvents()).toEqual([]);
  });

  it("keeps the exact token and password state when expiry or user update prevents confirmation", async () => {
    await requestPasswordReset(new Request("http://localhost/api/password-reset/request", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "user@example.com" }),
    }));
    const token = getDeliveredToken();
    expireToken();
    const expired = await confirmPasswordReset(new Request("http://localhost/api/password-reset/confirm", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: "new-password-123", confirmPassword: "new-password-123" }),
    }));
    expect(expired.status).toBe(400);
    expect(getUserById("user-1")?.passwordHash).toBe("old-password-hash");

    const current = getLatestTokenRecord("user-1")!;
    current.expiresAt = new Date(Date.now() + 60_000);
    setFailure("user");
    const failed = await confirmPasswordReset(new Request("http://localhost/api/password-reset/confirm", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: "new-password-123", confirmPassword: "new-password-123" }),
    }));
    expect(failed.status).toBe(500);
    expect(getLatestTokenRecord("user-1")?.tokenHash).toBe(current.tokenHash);
    expect(getUserById("user-1")?.passwordHash).toBe("old-password-hash");
  });

  it("allows one concurrent confirmation to win the exact-token compare-and-set", async () => {
    await requestPasswordReset(new Request("http://localhost/api/password-reset/request", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "user@example.com" }),
    }));
    const token = getDeliveredToken();
    const confirm = () => confirmPasswordReset(new Request("http://localhost/api/password-reset/confirm", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: "new-password-123", confirmPassword: "new-password-123" }),
    }));

    const responses = await Promise.all([confirm(), confirm()]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
    expect(getLatestTokenRecord("user-1")).toBeNull();
    expect(getUserById("user-1")?.passwordHash).toBe("hashed:new-password-123");
  });

  it("rejects a token that expires while password hashing is pending", async () => {
    const startedAt = new Date("2026-09-22T12:00:00.000Z");
    await requestPasswordReset(new Request("http://localhost/api/password-reset/request", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "user@example.com" }),
    }));
    const token = getDeliveredToken();
    vi.useFakeTimers();
    vi.setSystemTime(startedAt);
    getLatestTokenRecord("user-1")!.expiresAt = new Date(startedAt.getTime() + 1_000);
    const releaseHash = holdHash();
    const confirmation = confirmPasswordReset(new Request("http://localhost/api/password-reset/confirm", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: "new-password-123", confirmPassword: "new-password-123" }),
    }));
    await vi.waitFor(() => expect(hashMock).toHaveBeenCalled());
    vi.setSystemTime(new Date(startedAt.getTime() + 1_001));
    releaseHash();

    const response = await confirmation;
    vi.useRealTimers();
    expect(response.status).toBe(400);
    expect(getLatestTokenRecord("user-1")).toBeTruthy();
    expect(getUserById("user-1")?.passwordHash).toBe("old-password-hash");
    expect(getAuditEvents()).toHaveLength(1);
  });

  it("rejects old password and accepts new password after successful reset", async () => {
    await requestPasswordReset(
      new Request("http://localhost/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      })
    );

    const rawToken = getDeliveredToken();

    const confirmResponse = await confirmPasswordReset(
      new Request("http://localhost/api/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: rawToken,
          password: "new-password-123",
          confirmPassword: "new-password-123",
        }),
      })
    );

    expect(confirmResponse.status).toBe(200);

    const oldPasswordAttempt = await authorizeCredentials({
      email: "user@example.com",
      password: "old-password",
    });

    const newPasswordAttempt = await authorizeCredentials({
      email: "user@example.com",
      password: "new-password-123",
    });

    expect(oldPasswordAttempt).toBeNull();
    expect(newPasswordAttempt).toMatchObject({
      id: "user-1",
      email: "user@example.com",
    });
  });
});
