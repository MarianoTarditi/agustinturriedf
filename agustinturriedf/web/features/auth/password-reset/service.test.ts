import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/http/api-response";

const {
  hashMock,
  findUserByEmailMock,
  upsertResetTokenMock,
  findValidTokenByHashMock,
  consumeTokenAndUpdatePasswordMock,
  logPasswordResetEmailMock,
  auditAppendMock,
  outboxEnqueueMock,
  encryptPayloadMock,
  findUserByIdMock,
  consumeThrottleMock,
} = vi.hoisted(() => ({
  hashMock: vi.fn(),
  findUserByEmailMock: vi.fn(),
  upsertResetTokenMock: vi.fn(),
  findValidTokenByHashMock: vi.fn(),
  consumeTokenAndUpdatePasswordMock: vi.fn(),
  logPasswordResetEmailMock: vi.fn(),
  auditAppendMock: vi.fn(),
  outboxEnqueueMock: vi.fn(),
  encryptPayloadMock: vi.fn(),
  findUserByIdMock: vi.fn(),
  consumeThrottleMock: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  hash: hashMock,
}));

vi.mock("@/features/auth/password-reset/repository", () => ({
  passwordResetRepository: {
    findUserByEmail: findUserByEmailMock,
    upsertResetToken: upsertResetTokenMock,
    findValidTokenByHash: findValidTokenByHashMock,
    consumeTokenAndUpdatePassword: consumeTokenAndUpdatePasswordMock,
    inTransaction: vi.fn(async (operation) => operation({ transactionId: "reset-request" })),
  },
}));

vi.mock("@/features/users/repository", () => ({
  userRepository: { findById: findUserByIdMock },
}));

vi.mock("@/features/auth/password-reset/throttle", () => ({
  passwordResetActorThrottle: { consume: consumeThrottleMock },
  passwordResetTargetThrottle: { consume: consumeThrottleMock },
}));

vi.mock("@/features/auth/password-reset/logger", () => ({
  passwordResetLogger: {
    logPasswordResetEmail: logPasswordResetEmailMock,
  },
}));

vi.mock("@/features/audit/repository", () => ({
  auditRepository: { append: auditAppendMock },
}));

vi.mock("@/features/outbox/repository", () => ({
  outboxRepository: { enqueue: outboxEnqueueMock },
}));

vi.mock("@/features/outbox/crypto", () => ({
  encryptPayload: encryptPayloadMock,
}));

import { passwordResetService } from "@/features/auth/password-reset/service";

describe("passwordResetService.requestReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OUTBOX_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64url");
    process.env.OUTBOX_ENCRYPTION_KEY_ID = "test";
    consumeThrottleMock.mockResolvedValue(true);
  });

  it("returns generic message and does not create token when email does not exist", async () => {
    findUserByEmailMock.mockResolvedValue(null);

    const result = await passwordResetService.requestReset("missing@example.com");

    expect(result).toEqual({ message: "Si el email existe, te enviamos instrucciones." });
    expect(upsertResetTokenMock).not.toHaveBeenCalled();
    expect(logPasswordResetEmailMock).not.toHaveBeenCalled();
  });

  it("creates reset token when email exists", async () => {
    findUserByEmailMock.mockResolvedValue({ id: "user-1", email: "user@example.com" });

    await passwordResetService.requestReset("user@example.com");

    expect(upsertResetTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        tokenHash: expect.any(String),
      }),
      expect.anything()
    );
    expect(logPasswordResetEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
      })
    );
  });

  it("commits hashed reset state, audit, and encrypted delivery without exposing the bearer", async () => {
    findUserByEmailMock.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    encryptPayloadMock.mockReturnValue("encrypted-payload");

    await passwordResetService.requestReset("user@example.com");

    expect(auditAppendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PASSWORD_RESET_REQUESTED",
        subjectUserId: "user-1",
      }),
      expect.anything()
    );
    expect(outboxEnqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messageType: "EMAIL",
        resourceType: "PASSWORD_RESET",
        resourceId: "user-1",
        idempotencyKey: expect.stringMatching(/^password-reset:user-1:/),
        payloadEncrypted: "encrypted-payload",
      }),
      expect.anything()
    );
    expect(logPasswordResetEmailMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ resetUrl: expect.any(String) })
    );
  });

  it("replaces previous token through upsert on repeated requests", async () => {
    findUserByEmailMock.mockResolvedValue({ id: "user-1", email: "user@example.com" });

    await passwordResetService.requestReset("user@example.com");
    await passwordResetService.requestReset("user@example.com");

    expect(upsertResetTokenMock).toHaveBeenCalledTimes(2);
    expect(logPasswordResetEmailMock).toHaveBeenCalledTimes(2);
  });
});

describe("passwordResetService.requestResetForActor", () => {
  const trainer = { id: "trainer-1", role: "TRAINER" as const };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OUTBOX_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64url");
    process.env.OUTBOX_ENCRYPTION_KEY_ID = "test";
    consumeThrottleMock.mockResolvedValue(true);
  });

  it("allows an admin for any persisted target and consumes actor and target capacity before durable reset work", async () => {
    findUserByIdMock.mockResolvedValue({ id: "target-1", role: "ADMIN", email: "admin@example.com" });

    const result = await passwordResetService.requestResetForActor({ id: "admin-1", role: "ADMIN" }, "target-1");

    expect(result).toEqual({ message: "Solicitud de recuperación aceptada." });
    expect(consumeThrottleMock).toHaveBeenNthCalledWith(1, "actor:admin-1");
    expect(consumeThrottleMock).toHaveBeenNthCalledWith(2, "target:target-1");
    expect(upsertResetTokenMock).toHaveBeenCalledWith(expect.objectContaining({ userId: "target-1" }), expect.anything());
    expect(outboxEnqueueMock).toHaveBeenCalledWith(expect.objectContaining({ resourceId: "target-1" }), expect.anything());
  });

  it("denies trainer-to-team and exhausted capacity before a reset mutation", async () => {
    findUserByIdMock.mockResolvedValue({ id: "target-1", role: "TRAINER", email: "team@example.com" });

    await expect(passwordResetService.requestResetForActor(trainer, "target-1")).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(consumeThrottleMock).not.toHaveBeenCalled();
    expect(upsertResetTokenMock).not.toHaveBeenCalled();

    findUserByIdMock.mockResolvedValue({ id: "student-1", role: "STUDENT", email: "student@example.com" });
    consumeThrottleMock.mockResolvedValueOnce(false);

    await expect(passwordResetService.requestResetForActor(trainer, "student-1")).rejects.toMatchObject({ status: 429, code: "RATE_LIMITED" });
    expect(upsertResetTokenMock).not.toHaveBeenCalled();
  });
});

describe("passwordResetService.confirmReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hashMock.mockResolvedValue("next-password-hash");
  });

  it("updates password and consumes token when token is valid", async () => {
    findValidTokenByHashMock.mockResolvedValue({
      userId: "user-1",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    consumeTokenAndUpdatePasswordMock.mockResolvedValue(true);

    const result = await passwordResetService.confirmReset({
      token: "raw-token",
      password: "12345678",
    });

    expect(hashMock).toHaveBeenCalledWith("12345678", 10);
    expect(consumeTokenAndUpdatePasswordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        passwordHash: "next-password-hash",
      })
    );
    expect(result).toEqual({ message: "Contraseña actualizada." });
  });

  it("rejects invalid token", async () => {
    findValidTokenByHashMock.mockResolvedValue(null);

    await expect(
      passwordResetService.confirmReset({
        token: "invalid-token",
        password: "12345678",
      })
    ).rejects.toMatchObject({
      status: 400,
      code: "INVALID_OR_EXPIRED_TOKEN",
    } satisfies Pick<ApiError, "status" | "code">);
  });

  it("rejects expired token", async () => {
    findValidTokenByHashMock.mockResolvedValue({
      userId: "user-1",
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(
      passwordResetService.confirmReset({
        token: "expired-token",
        password: "12345678",
      })
    ).rejects.toMatchObject({
      status: 400,
      code: "INVALID_OR_EXPIRED_TOKEN",
    } satisfies Pick<ApiError, "status" | "code">);
  });

  it("rejects used token when consume operation fails", async () => {
    findValidTokenByHashMock.mockResolvedValue({
      userId: "user-1",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    consumeTokenAndUpdatePasswordMock.mockResolvedValue(false);

    await expect(
      passwordResetService.confirmReset({
        token: "already-used-token",
        password: "12345678",
      })
    ).rejects.toMatchObject({
      status: 400,
      code: "INVALID_OR_EXPIRED_TOKEN",
    } satisfies Pick<ApiError, "status" | "code">);
  });
});
