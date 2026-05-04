import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findByEmailMock,
  createMock,
  findByIdMock,
  updateTokenMock,
  findByTokenHashMock,
  markConsumedMock,
  markConsumedIfTokenMatchesMock,
  markRevokedMock,
  listByTrainerMock,
  listAllMock,
  sendActivationEmailMock,
  hashMock,
  findTrainerByIdMock,
  createUserMock,
  ensureFolderForStudentMock,
  ensureStudentRoutineDirectoryMock,
} = vi.hoisted(() => ({
  findByEmailMock: vi.fn(),
  createMock: vi.fn(),
  findByIdMock: vi.fn(),
  updateTokenMock: vi.fn(),
  findByTokenHashMock: vi.fn(),
  markConsumedMock: vi.fn(),
  markConsumedIfTokenMatchesMock: vi.fn(),
  markRevokedMock: vi.fn(),
  listByTrainerMock: vi.fn(),
  listAllMock: vi.fn(),
  sendActivationEmailMock: vi.fn(),
  hashMock: vi.fn(),
  findTrainerByIdMock: vi.fn(),
  createUserMock: vi.fn(),
  ensureFolderForStudentMock: vi.fn(),
  ensureStudentRoutineDirectoryMock: vi.fn(),
}));

vi.mock("bcryptjs", () => ({ hash: hashMock }));

vi.mock("@/features/invitations/repository", () => ({
  invitationRepository: {
    findByEmail: findByEmailMock,
    create: createMock,
    findById: findByIdMock,
    updateToken: updateTokenMock,
    findByTokenHash: findByTokenHashMock,
    markConsumed: markConsumedMock,
    markConsumedIfTokenMatches: markConsumedIfTokenMatchesMock,
    markRevoked: markRevokedMock,
    listByTrainer: listByTrainerMock,
    listAll: listAllMock,
  },
}));

vi.mock("@/features/invitations/email", () => ({
  sendActivationEmail: sendActivationEmailMock,
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

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (callback: (transaction: any) => Promise<unknown>) =>
      callback({
        user: {},
        trainerConfig: {},
        currentPayment: {},
        routineFolder: {},
        invitation: {},
      }),
  },
}));

import { invitationService } from "@/features/invitations/service";

describe("invitationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_URL = "http://localhost:3010";
    hashMock.mockResolvedValue("hashed-password");
    markConsumedIfTokenMatchesMock.mockResolvedValue(true);
  });

  it("creates invitation and sends activation email", async () => {
    findByEmailMock.mockResolvedValue(null);
    findTrainerByIdMock.mockResolvedValue({ id: "c123456789012345678901234", role: "TRAINER" });
    createMock.mockResolvedValue({
      id: "inv-1",
      email: "student@example.com",
      firstName: "Ana",
      lastName: "Gomez",
      trainerId: "c123456789012345678901234",
      status: "SENT",
      expiresAt: new Date(Date.now() + 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await invitationService.create(
      { id: "c123456789012345678901234", role: "TRAINER" } as any,
      {
        firstName: "Ana",
        lastName: "Gomez",
        email: "student@example.com",
        trainerId: "c123456789012345678901234",
        initialPaymentStartDate: "2026-05-01",
      }
    );

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ email: "student@example.com" }));
    expect(sendActivationEmailMock).toHaveBeenCalledTimes(1);
    expect(result.email).toBe("student@example.com");
  });

  it("rejects creation when email already has active invitation", async () => {
    findByEmailMock.mockResolvedValue({ id: "inv-existing", status: "SENT" });

    await expect(
      invitationService.create(
        { id: "c123456789012345678901234", role: "TRAINER" } as any,
        {
          firstName: "Ana",
          lastName: "Gomez",
          email: "student@example.com",
          trainerId: "c123456789012345678901234",
          initialPaymentStartDate: "2026-05-01",
        }
      )
    ).rejects.toMatchObject({ status: 409, code: "CONFLICT" });
  });

  it("resends invitation by rotating token and expiration", async () => {
    findByIdMock.mockResolvedValue({
      id: "inv-1",
      trainerId: "c123456789012345678901234",
      email: "student@example.com",
      firstName: "Ana",
      lastName: "Gomez",
      status: "SENT",
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    updateTokenMock.mockResolvedValue({
      id: "inv-1",
      trainerId: "c123456789012345678901234",
      email: "student@example.com",
      firstName: "Ana",
      lastName: "Gomez",
      status: "SENT",
      expiresAt: new Date(Date.now() + 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await invitationService.resend("inv-1", { id: "c123456789012345678901234", role: "TRAINER" } as any);

    expect(updateTokenMock).toHaveBeenCalledTimes(1);
    expect(sendActivationEmailMock).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("inv-1");
  });

  it("rejects activation when token expired", async () => {
    findByTokenHashMock.mockResolvedValue({
      id: "inv-1",
      trainerId: "c123456789012345678901234",
      email: "student@example.com",
      firstName: "Ana",
      lastName: "Gomez",
      status: "SENT",
      expiresAt: new Date(Date.now() - 1000),
      initialPaymentStartDate: new Date(),
    });

    await expect(
      invitationService.activate({ token: "raw-token", password: "Segura123", confirmPassword: "Segura123" })
    ).rejects.toMatchObject({ status: 400, code: "INVALID_OR_EXPIRED_TOKEN" });
  });

  it("activates invitation once and marks token consumed", async () => {
    findByTokenHashMock.mockResolvedValue({
      id: "inv-1",
      trainerId: "c123456789012345678901234",
      email: "student@example.com",
      firstName: "Ana",
      lastName: "Gomez",
      phone: null,
      birthDate: null,
      gender: null,
      heightCm: null,
      weightKg: null,
      status: "SENT",
      expiresAt: new Date(Date.now() + 5000),
      initialPaymentStartDate: new Date("2026-05-01T00:00:00.000Z"),
    });
    createUserMock.mockResolvedValue({
      id: "user-1",
      firstName: "Ana",
      lastName: "Gomez",
      email: "student@example.com",
      role: "STUDENT",
      studentProfile: { id: "sp-1", trainerId: "c123456789012345678901234", status: "ACTIVE" },
    });

    const result = await invitationService.activate({
      token: "raw-token",
      password: "Segura123",
      confirmPassword: "Segura123",
    });

    expect(hashMock).toHaveBeenCalledWith("Segura123", 12);
    expect(createUserMock).toHaveBeenCalledTimes(1);
    expect(markConsumedIfTokenMatchesMock).toHaveBeenCalledWith(
      expect.objectContaining({ invitationId: "inv-1" }),
      expect.any(Object)
    );
    expect(ensureFolderForStudentMock).toHaveBeenCalledWith(
      expect.objectContaining({ studentProfileId: "sp-1" }),
      expect.any(Object)
    );
    expect(ensureStudentRoutineDirectoryMock).toHaveBeenCalledWith("sp-1");
    expect(result.message).toBe("Cuenta activada. Ya podés iniciar sesión.");
  });

  it("revokes invitation for owner trainer", async () => {
    findByIdMock.mockResolvedValue({ id: "inv-1", trainerId: "c123456789012345678901234", status: "SENT" });

    await invitationService.revoke("inv-1", { id: "c123456789012345678901234", role: "TRAINER" } as any);

    expect(markRevokedMock).toHaveBeenCalledWith("inv-1");
  });
});
