import { beforeEach, describe, expect, it, vi } from "vitest";

type UserRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  passwordHash: string;
  passwordUpdatedAt: Date | null;
  role: "ADMIN";
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
  getUserById,
  consoleInfoMock,
} = vi.hoisted(() => {
  const usersById = new Map<string, UserRecord>();
  const userIdsByEmail = new Map<string, string>();
  const tokenByUserId = new Map<string, PasswordResetTokenRecord>();
  const consoleInfoMock = vi.fn();

  const resetState = () => {
    usersById.clear();
    userIdsByEmail.clear();
    tokenByUserId.clear();

    const user: UserRecord = {
      id: "user-1",
      email: "user@example.com",
      firstName: "Test",
      lastName: "User",
      photoUrl: null,
      passwordHash: "old-password-hash",
      passwordUpdatedAt: null,
      role: "ADMIN",
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

  const passwordResetTokenDeleteMany = vi.fn(async (args: any) => {
    const userId = String(args.where.userId);
    const hadToken = tokenByUserId.delete(userId);

    return {
      count: hadToken ? 1 : 0,
    };
  });

  const userUpdate = vi.fn(async (args: any) => {
    const userId = String(args.where.id);
    const user = usersById.get(userId);

    if (!user) {
      throw new Error("User not found in test state");
    }

    user.passwordHash = String(args.data.passwordHash);
    user.passwordUpdatedAt = args.data.passwordUpdatedAt as Date;

    return user;
  });

  const prismaMock = {
    user: {
      findUnique: userFindUnique,
    },
    passwordResetToken: {
      upsert: passwordResetTokenUpsert,
      findUnique: passwordResetTokenFindUnique,
      deleteMany: passwordResetTokenDeleteMany,
    },
    $transaction: async (callback: (transaction: any) => Promise<unknown>) =>
      callback({
        user: {
          update: userUpdate,
        },
        passwordResetToken: {
          deleteMany: passwordResetTokenDeleteMany,
        },
      }),
  };

  return {
    hashMock: vi.fn(async (password: string) => `hashed:${password}`),
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
    getUserById,
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
import {
  PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
  POST as requestPasswordReset,
} from "@/app/api/password-reset/request/route";
import { authConfig } from "@/auth";
import { authorizeCredentials } from "@/features/auth/credentials";

describe("password reset integrated flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetState();
    vi.spyOn(console, "info").mockImplementation(consoleInfoMock);
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

    const firstLogCall = consoleInfoMock.mock.calls[0]?.[0] as
      | { event: string; resetUrl: string; expiresAt: Date }
      | undefined;

    expect(firstLogCall).toBeDefined();
    expect(firstLogCall?.event).toBe("password_reset_requested");

    const firstToken = new URL(firstLogCall!.resetUrl).searchParams.get("token");
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

    const secondLogCall = consoleInfoMock.mock.calls[1]?.[0] as
      | { resetUrl: string }
      | undefined;
    const secondToken = new URL(secondLogCall!.resetUrl).searchParams.get("token");

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

  it("rejects old password and accepts new password after successful reset", async () => {
    await requestPasswordReset(
      new Request("http://localhost/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      })
    );

    const logCall = consoleInfoMock.mock.calls[0]?.[0] as { resetUrl: string } | undefined;
    const rawToken = new URL(logCall!.resetUrl).searchParams.get("token");

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
