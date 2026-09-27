import { beforeEach, describe, expect, it, vi } from "vitest";

import { decryptPayload } from "@/features/outbox/crypto";

type InvitationRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  trainerId: string;
  tokenHash: string | null;
  expiresAt: Date | null;
  status: "PENDING" | "SENT" | "CONSUMED" | "EXPIRED" | "REVOKED";
  phone?: string | null;
  birthDate?: Date | null;
  gender?: "MALE" | "FEMALE" | "NON_BINARY" | "OTHER" | null;
  heightCm?: number | null;
  weightKg?: number | null;
  initialPaymentStartDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  consumedAt?: Date | null;
};

const {
  findByEmailMock,
  createInvitationMock,
  findByTokenHashMock,
  markConsumedIfTokenMatchesMock,
  findTrainerByIdMock,
  findUserByEmailMock,
  createUserMock,
  ensureFolderForStudentMock,
  ensureStudentRoutineDirectoryMock,
  appendAuditEventMock,
  enqueueOutboxMock,
} = vi.hoisted(() => ({
  findByEmailMock: vi.fn(),
  createInvitationMock: vi.fn(),
  findByTokenHashMock: vi.fn(),
  markConsumedIfTokenMatchesMock: vi.fn(),
  findTrainerByIdMock: vi.fn(),
  findUserByEmailMock: vi.fn(),
  createUserMock: vi.fn(),
  ensureFolderForStudentMock: vi.fn(),
  ensureStudentRoutineDirectoryMock: vi.fn(),
  appendAuditEventMock: vi.fn(),
  enqueueOutboxMock: vi.fn(),
}));

const { invitationStore, resetState, createdUsers, outboxMessages } = vi.hoisted(() => {
  const invitationStore = new Map<string, InvitationRecord>();
  const createdUsers: Array<{ id: string; email: string; studentProfileId: string }> = [];
  const outboxMessages: Array<{ payloadEncrypted: string }> = [];

  const resetState = () => {
    invitationStore.clear();
    createdUsers.length = 0;
    outboxMessages.length = 0;
  };

  return { invitationStore, resetState, createdUsers, outboxMessages };
});

vi.mock("@/features/invitations/repository", () => ({
  invitationRepository: {
    findByEmail: findByEmailMock,
    create: createInvitationMock,
    findByTokenHash: findByTokenHashMock,
    markConsumedIfTokenMatches: markConsumedIfTokenMatchesMock,
  },
}));

vi.mock("@/features/users/repository", () => ({
  userRepository: {
    findById: findTrainerByIdMock,
    findByEmail: findUserByEmailMock,
    create: createUserMock,
  },
}));

vi.mock("@/features/routines/repository", () => ({
  routinesRepository: {
    ensureFolderForStudent: ensureFolderForStudentMock,
  },
}));

vi.mock("@/features/routines/storage", () => ({
  ensureStudentRoutineDirectory: ensureStudentRoutineDirectoryMock,
}));

vi.mock("@/features/audit/repository", () => ({
  auditRepository: { append: appendAuditEventMock },
}));

vi.mock("@/features/outbox/repository", () => ({
  outboxRepository: { enqueue: enqueueOutboxMock },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        user: {
          create: vi.fn(),
        },
        trainerConfig: {
          upsert: vi.fn(async () => ({ defaultMonthlyAmountInCents: 3000000 })),
        },
        currentPayment: {
          create: vi.fn(),
        },
        routineFolder: {
          upsert: vi.fn(async () => ({ id: "rf-1" })),
        },
        invitation: {
          updateMany: vi.fn(),
        },
      }),
  },
}));

import { invitationService } from "@/features/invitations/service";

const outboxKey = { id: "current", value: Buffer.alloc(32, 1).toString("base64url") };
const activationUrlAt = (index: number) =>
  decryptPayload<{ activationUrl: string }>(outboxMessages[index].payloadEncrypted, outboxKey).activationUrl;

describe("invitations create -> activate integration flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetState();
    process.env.NEXTAUTH_URL = "http://localhost:3010";
    process.env.OUTBOX_ENCRYPTION_KEY_ID = outboxKey.id;
    process.env.OUTBOX_ENCRYPTION_KEY = outboxKey.value;

    findTrainerByIdMock.mockResolvedValue({ id: "c123456789012345678901234", role: "TRAINER", status: "ACTIVE" });
    findUserByEmailMock.mockResolvedValue(null);

    findByEmailMock.mockImplementation(async (email: string) => {
      for (const invitation of invitationStore.values()) {
        if (invitation.email === email) return invitation;
      }
      return null;
    });

    createInvitationMock.mockImplementation(async (input: any) => {
      const existingByEmail = Array.from(invitationStore.values()).find((entry) => entry.email === input.email);

      if (existingByEmail) {
        const updated: InvitationRecord = {
          ...existingByEmail,
          firstName: input.firstName,
          lastName: input.lastName,
          trainerId: input.trainerId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          status: input.status,
          phone: input.phone,
          birthDate: input.birthDate,
          gender: input.gender,
          heightCm: input.heightCm,
          weightKg: input.weightKg,
          initialPaymentStartDate: input.initialPaymentStartDate,
          consumedAt: null,
          updatedAt: new Date(),
        };

        invitationStore.set(updated.id, updated);
        return updated;
      }

      const record: InvitationRecord = {
        id: `inv-${invitationStore.size + 1}`,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        trainerId: input.trainerId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        status: input.status,
        phone: input.phone,
        birthDate: input.birthDate,
        gender: input.gender,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        initialPaymentStartDate: input.initialPaymentStartDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      invitationStore.set(record.id, record);
      return record;
    });

    enqueueOutboxMock.mockImplementation(async (input: { payloadEncrypted: string }) => {
      outboxMessages.push(input);
      return { id: `outbox-${outboxMessages.length}` };
    });

    findByTokenHashMock.mockImplementation(async (tokenHash: string) => {
      for (const invitation of invitationStore.values()) {
        if (invitation.tokenHash === tokenHash) return invitation;
      }
      return null;
    });

    createUserMock.mockImplementation(async (input: any) => {
      const user = {
        id: `user-${createdUsers.length + 1}`,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        role: "STUDENT",
        studentProfile: {
          id: `sp-${createdUsers.length + 1}`,
          trainerId: input.studentProfile.trainerId,
          status: "ACTIVE",
        },
      };

      createdUsers.push({
        id: user.id,
        email: user.email,
        studentProfileId: user.studentProfile.id,
      });

      return user;
    });

    markConsumedIfTokenMatchesMock.mockImplementation(async ({ invitationId, tokenHash }: { invitationId: string; tokenHash: string }) => {
      const invitation = invitationStore.get(invitationId);
      if (!invitation || invitation.tokenHash !== tokenHash) return false;

      invitation.status = "CONSUMED";
      invitation.tokenHash = null;
      invitation.consumedAt = new Date();
      invitation.updatedAt = new Date();
      invitationStore.set(invitationId, invitation);

      return true;
    });
  });

  it("creates invitation first, then activates student once with single-use token", async () => {
    const actor = { id: "c123456789012345678901234", role: "TRAINER" } as any;

    const invitation = await invitationService.create(actor, {
      firstName: "Ana",
      lastName: "Gomez",
      email: "ana@example.com",
      trainerId: "c123456789012345678901234",
      initialPaymentStartDate: "2026-05-01",
    });

    expect(invitation.email).toBe("ana@example.com");
    expect(createdUsers).toHaveLength(0);
    expect(outboxMessages).toHaveLength(1);

    const rawToken = new URL(activationUrlAt(0)).searchParams.get("token");
    expect(rawToken).toBeTruthy();

    const activationResult = await invitationService.activate({
      token: rawToken,
      password: "Segura123",
      confirmPassword: "Segura123",
    });

    expect(activationResult).toEqual({ message: "Cuenta activada. Ya podés iniciar sesión." });
    expect(createdUsers).toHaveLength(1);
    expect(ensureFolderForStudentMock).toHaveBeenCalledTimes(1);
    expect(ensureStudentRoutineDirectoryMock).toHaveBeenCalledTimes(1);

    await expect(
      invitationService.activate({
        token: rawToken,
        password: "Segura123",
        confirmPassword: "Segura123",
      })
    ).rejects.toMatchObject({ status: 400, code: "INVALID_OR_EXPIRED_TOKEN" });
  });

  it("rejects re-issuing an active invitation for the same email", async () => {
    const actor = { id: "c123456789012345678901234", role: "TRAINER" } as any;

    await invitationService.create(actor, {
      firstName: "Ana",
      lastName: "Gomez",
      email: "ana@example.com",
      trainerId: "c123456789012345678901234",
      initialPaymentStartDate: "2026-05-01",
    });

    const firstToken = new URL(activationUrlAt(0)).searchParams.get("token");
    expect(firstToken).toBeTruthy();

    await expect(
      invitationService.create(actor, {
        firstName: "Ana",
        lastName: "Gomez",
        email: "ana@example.com",
        trainerId: "c123456789012345678901234",
        initialPaymentStartDate: "2026-05-01",
      })
    ).rejects.toMatchObject({ status: 409, code: "CONFLICT" });

    expect(outboxMessages).toHaveLength(1);

    await expect(
      invitationService.activate({ token: firstToken, password: "Segura123", confirmPassword: "Segura123" })
    ).resolves.toEqual({ message: "Cuenta activada. Ya podés iniciar sesión." });
  });
});
