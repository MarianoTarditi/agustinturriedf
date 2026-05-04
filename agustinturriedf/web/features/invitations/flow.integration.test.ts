import { beforeEach, describe, expect, it, vi } from "vitest";

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
  createUserMock,
  ensureFolderForStudentMock,
  ensureStudentRoutineDirectoryMock,
  sendActivationEmailMock,
} = vi.hoisted(() => ({
  findByEmailMock: vi.fn(),
  createInvitationMock: vi.fn(),
  findByTokenHashMock: vi.fn(),
  markConsumedIfTokenMatchesMock: vi.fn(),
  findTrainerByIdMock: vi.fn(),
  createUserMock: vi.fn(),
  ensureFolderForStudentMock: vi.fn(),
  ensureStudentRoutineDirectoryMock: vi.fn(),
  sendActivationEmailMock: vi.fn(),
}));

const { invitationStore, resetState, createdUsers, sentActivationUrls } = vi.hoisted(() => {
  const invitationStore = new Map<string, InvitationRecord>();
  const createdUsers: Array<{ id: string; email: string; studentProfileId: string }> = [];
  const sentActivationUrls: string[] = [];

  const resetState = () => {
    invitationStore.clear();
    createdUsers.length = 0;
    sentActivationUrls.length = 0;
  };

  return { invitationStore, resetState, createdUsers, sentActivationUrls };
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

vi.mock("@/features/invitations/email", () => ({
  sendActivationEmail: sendActivationEmailMock,
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

describe("invitations create -> activate integration flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetState();
    process.env.NEXTAUTH_URL = "http://localhost:3010";

    findTrainerByIdMock.mockResolvedValue({ id: "c123456789012345678901234", role: "TRAINER" });

    findByEmailMock.mockImplementation(async (email: string) => {
      for (const invitation of invitationStore.values()) {
        if (invitation.email === email) return invitation;
      }
      return null;
    });

    createInvitationMock.mockImplementation(async (input: any) => {
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

    sendActivationEmailMock.mockImplementation(async (input: { activationUrl: string }) => {
      sentActivationUrls.push(input.activationUrl);
      return { id: "mail-1" };
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
    expect(sentActivationUrls).toHaveLength(1);

    const rawToken = new URL(sentActivationUrls[0]).searchParams.get("token");
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
});
