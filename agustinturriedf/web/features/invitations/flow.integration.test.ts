import { beforeEach, describe, expect, it, vi } from "vitest";

import { decryptPayload } from "@/features/outbox/crypto";

type InvitationRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  trainerId: string | null;
  tokenHash: string | null;
  expiresAt: Date | null;
  status: "PENDING" | "SENT" | "CONSUMED" | "EXPIRED" | "REVOKED";
  role: "ADMIN" | "TRAINER" | "STUDENT";
  deliveryStatus: "PENDING" | "SENT" | "FAILED";
  version: number;
  createdAt: Date;
  updatedAt: Date;
  consumedAt?: Date | null;
};

const {
  lockIssuanceForEmailMock,
  findActiveByEmailMock,
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
  transactionMock,
} = vi.hoisted(() => ({
  lockIssuanceForEmailMock: vi.fn(),
  findActiveByEmailMock: vi.fn(),
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
  transactionMock: vi.fn(),
}));

const {
  invitationStore,
  createdUsers,
  auditEvents,
  outboxMessages,
  lockState,
  resetState,
  seedInvitation,
} = vi.hoisted(() => {
  const invitationStore = new Map<string, InvitationRecord>();
  const createdUsers: Array<{ id: string; email: string; studentProfileId: string }> = [];
  const auditEvents: unknown[] = [];
  const outboxMessages: Array<{ payloadEncrypted: string }> = [];
  const lockState = { locked: false, contentions: 0, waiters: [] as Array<() => void>, nextInvitationId: 1 };

  const resetState = () => {
    invitationStore.clear();
    createdUsers.length = 0;
    auditEvents.length = 0;
    outboxMessages.length = 0;
    lockState.locked = false;
    lockState.contentions = 0;
    lockState.waiters.length = 0;
    lockState.nextInvitationId = 1;
  };

  const seedInvitation = (input: Pick<InvitationRecord, "email" | "status" | "tokenHash" | "expiresAt">) => {
    const record: InvitationRecord = {
      id: `history-${invitationStore.size + 1}`,
      email: input.email,
      firstName: "Historical",
      lastName: "Invitation",
      trainerId: "c123456789012345678901234",
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      status: input.status,
      role: "STUDENT",
      deliveryStatus: "PENDING",
      version: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    invitationStore.set(record.id, record);
    return record;
  };

  return { invitationStore, createdUsers, auditEvents, outboxMessages, lockState, resetState, seedInvitation };
});

vi.mock("@/features/invitations/repository", () => ({
  invitationRepository: {
    lockIssuanceForEmail: lockIssuanceForEmailMock,
    findActiveByEmail: findActiveByEmailMock,
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
  routinesRepository: { ensureFolderForStudent: ensureFolderForStudentMock },
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
  prisma: { $transaction: transactionMock },
}));

import { invitationService } from "@/features/invitations/service";

const outboxKey = { id: "current", value: Buffer.alloc(32, 1).toString("base64url") };
const actor = { id: "c123456789012345678901234", role: "TRAINER" } as any;
const createInput = (email = "ana@example.com") => ({
  firstName: "Ana",
  lastName: "Gomez",
  email,
  trainerId: "c123456789012345678901234",
  initialPaymentStartDate: "2026-05-01",
});
const activationUrlAt = (index: number) =>
  decryptPayload<{ activationUrl: string }>(outboxMessages[index].payloadEncrypted, outboxKey).activationUrl;

describe("invitations create -> activate integration flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetState();
    process.env.NEXTAUTH_URL = "http://localhost:3010";
    process.env.OUTBOX_ENCRYPTION_KEY_ID = outboxKey.id;
    process.env.OUTBOX_ENCRYPTION_KEY = outboxKey.value;

    findTrainerByIdMock.mockResolvedValue({ id: actor.id, role: "TRAINER", status: "ACTIVE" });
    findUserByEmailMock.mockResolvedValue(null);

    transactionMock.mockImplementation(async (callback: (transaction: any) => Promise<unknown>) => {
      let ownsLock = false;
      const transaction: any = {
        invitations: new Map(Array.from(invitationStore, ([id, invitation]) => [id, structuredClone(invitation)])),
        audits: structuredClone(auditEvents),
        outbox: structuredClone(outboxMessages),
        $executeRaw: async () => {
          if (lockState.locked) {
            lockState.contentions += 1;
            await new Promise<void>((resolve) => lockState.waiters.push(resolve));
          }
          lockState.locked = true;
          ownsLock = true;
          transaction.invitations = new Map(
            Array.from(invitationStore, ([id, invitation]) => [id, structuredClone(invitation)])
          );
          transaction.audits = structuredClone(auditEvents);
          transaction.outbox = structuredClone(outboxMessages);
        },
        user: {},
        paymentConfig: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "GLOBAL", defaultMonthlyAmountInCents: 3_000_000, version: 1 }) },
        currentPayment: { create: vi.fn().mockImplementation(({ data }) => ({ id: `cp-${data.studentProfileId}`, ...data })) },
        routineFolder: {},
        invitation: {},
      };

      try {
        const result = await callback(transaction);
        if (ownsLock) {
          invitationStore.clear();
          for (const [id, invitation] of transaction.invitations) invitationStore.set(id, invitation);
          auditEvents.splice(0, auditEvents.length, ...transaction.audits);
          outboxMessages.splice(0, outboxMessages.length, ...transaction.outbox);
        }
        return result;
      } finally {
        if (ownsLock) {
          lockState.locked = false;
          lockState.waiters.shift()?.();
        }
      }
    });

    lockIssuanceForEmailMock.mockImplementation(async (_email: string, transaction: any) => transaction.$executeRaw());
    findActiveByEmailMock.mockImplementation(async (email: string, now: Date, transaction: any) => {
      const invitations: Map<string, InvitationRecord> = transaction.invitations;
      return Array.from(invitations.values()).find((invitation) =>
        invitation.email === email &&
        ["PENDING", "SENT"].includes(invitation.status) &&
        invitation.tokenHash !== null &&
        invitation.expiresAt !== null &&
        invitation.expiresAt.getTime() > now.getTime()
      ) ?? null;
    });
    createInvitationMock.mockImplementation(async (input: any, transaction: any) => {
      const record: InvitationRecord = {
        ...input,
        id: `inv-${lockState.nextInvitationId++}`,
        role: input.role ?? "STUDENT",
        deliveryStatus: "PENDING",
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      transaction.invitations.set(record.id, record);
      return record;
    });
    appendAuditEventMock.mockImplementation(async (event: unknown, transaction: any) => {
      transaction.audits.push(event);
    });
    enqueueOutboxMock.mockImplementation(async (message: { payloadEncrypted: string }, transaction: any) => {
      transaction.outbox.push(message);
      return { id: `outbox-${transaction.outbox.length}` };
    });
    findByTokenHashMock.mockImplementation(async (tokenHash: string) =>
      Array.from(invitationStore.values()).find((invitation) => invitation.tokenHash === tokenHash) ?? null
    );
    createUserMock.mockImplementation(async (input: any) => {
      const user = {
        id: `user-${createdUsers.length + 1}`,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        role: "STUDENT",
        studentProfile: { id: `sp-${createdUsers.length + 1}`, trainerId: input.studentProfile.trainerId, status: "ACTIVE" },
      };
      createdUsers.push({ id: user.id, email: user.email, studentProfileId: user.studentProfile.id });
      return user;
    });
    markConsumedIfTokenMatchesMock.mockImplementation(async ({ invitationId, tokenHash }: { invitationId: string; tokenHash: string }) => {
      const invitation = invitationStore.get(invitationId);
      if (!invitation || invitation.tokenHash !== tokenHash) return false;
      Object.assign(invitation, { status: "CONSUMED", tokenHash: null, consumedAt: new Date(), updatedAt: new Date() });
      return true;
    });
  });

  it("creates invitation first, then activates the student once with a single-use token", async () => {
    const invitation = await invitationService.create(actor, createInput());

    expect(invitation.email).toBe("ana@example.com");
    expect(createdUsers).toHaveLength(0);
    expect(outboxMessages).toHaveLength(1);

    const rawToken = new URL(activationUrlAt(0)).searchParams.get("token");
    expect(rawToken).toBeTruthy();

    await expect(invitationService.activate({
      token: rawToken,
      password: "Segura123",
      confirmPassword: "Segura123",
    })).resolves.toEqual({ message: "Cuenta activada. Ya podés iniciar sesión." });

    expect(createdUsers).toHaveLength(1);
    expect(ensureFolderForStudentMock).toHaveBeenCalledTimes(1);
    expect(ensureStudentRoutineDirectoryMock).toHaveBeenCalledTimes(1);
    await expect(invitationService.activate({
      token: rawToken,
      password: "Segura123",
      confirmPassword: "Segura123",
    })).rejects.toMatchObject({ status: 400, code: "INVALID_OR_EXPIRED_TOKEN" });
  });

  it.each([
    ["revoked", "REVOKED", "historical-token", new Date("2099-01-01T00:00:00.000Z")],
    ["consumed", "CONSUMED", null, new Date("2099-01-01T00:00:00.000Z")],
    ["explicitly expired", "EXPIRED", "historical-token", new Date("2099-01-01T00:00:00.000Z")],
    ["expired pending", "PENDING", "historical-token", new Date("2000-01-01T00:00:00.000Z")],
    ["expired sent", "SENT", "historical-token", new Date("2000-01-01T00:00:00.000Z")],
    ["tokenless pending", "PENDING", null, new Date("2099-01-01T00:00:00.000Z")],
    ["tokenless sent", "SENT", null, new Date("2099-01-01T00:00:00.000Z")],
  ] as const)("preserves a %s invitation and creates a distinct new cycle", async (_label, status, tokenHash, expiresAt) => {
    const historical = seedInvitation({ email: "student@example.com", status, tokenHash, expiresAt });
    const snapshot = structuredClone(historical);

    await invitationService.create(actor, createInput(" Student@Example.com "));

    expect(invitationStore.size).toBe(2);
    expect(invitationStore.get(historical.id)).toEqual(snapshot);
    expect(Array.from(invitationStore.values()).filter((invitation) =>
      ["PENDING", "SENT"].includes(invitation.status) &&
      invitation.tokenHash &&
      invitation.expiresAt &&
      invitation.expiresAt.getTime() > Date.now()
    )).toHaveLength(1);
    expect(auditEvents).toHaveLength(1);
    expect(outboxMessages).toHaveLength(1);
  });

  it.each(["PENDING", "SENT"] as const)("blocks a usable %s invitation without side effects", async (status) => {
    seedInvitation({
      email: "student@example.com",
      status,
      tokenHash: "active-token",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    });

    await expect(invitationService.create(actor, createInput("student@example.com"))).rejects.toMatchObject({
      message: "Invitation already exists",
      status: 409,
      code: "CONFLICT",
    });

    expect(invitationStore.size).toBe(1);
    expect(auditEvents).toHaveLength(0);
    expect(outboxMessages).toHaveLength(0);
  });

  it("serializes concurrent normalized-email issuance and commits winner-only side effects", async () => {
    const results = await Promise.allSettled([
      invitationService.create(actor, createInput(" Student@Example.com ")),
      invitationService.create(actor, createInput("student@example.com")),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { status: 409, code: "CONFLICT" },
    });
    expect(lockState.contentions).toBe(1);
    expect(lockIssuanceForEmailMock).toHaveBeenCalledTimes(2);
    expect(invitationStore.size).toBe(1);
    expect(auditEvents).toHaveLength(1);
    expect(outboxMessages).toHaveLength(1);
  });

  it.each(["audit", "outbox"])("rolls back the winner cycle when %s persistence fails", async (failure) => {
    if (failure === "audit") appendAuditEventMock.mockRejectedValueOnce(new Error("audit failed"));
    else enqueueOutboxMock.mockRejectedValueOnce(new Error("outbox failed"));

    await expect(invitationService.create(actor, createInput())).rejects.toThrow(`${failure} failed`);

    expect(invitationStore.size).toBe(0);
    expect(auditEvents).toHaveLength(0);
    expect(outboxMessages).toHaveLength(0);
  });
});
