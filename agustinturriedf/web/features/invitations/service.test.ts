import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  randomBytesMock.mockImplementation(actual.randomBytes);
  return { ...actual, randomBytes: randomBytesMock, default: { ...actual, randomBytes: randomBytesMock } };
});

const {
  randomBytesMock,
  lockIssuanceForEmailMock,
  findActiveByEmailMock,
  findPendingReplacementByEmailMock,
  createMock,
  findByIdMock,
  resendIfCurrentMock,
  replacePendingForEmailMock,
  findByTokenHashMock,
  markConsumedMock,
  markConsumedIfTokenMatchesMock,
  revokeIfCurrentMock,
  listByTrainerMock,
  listAllMock,
  listPageMock,
  sendActivationEmailMock,
  hashMock,
  findTrainerByIdMock,
  createUserMock,
  ensureFolderForStudentMock,
  ensureStudentRoutineDirectoryMock,
  findUserByEmailMock,
  appendAuditMock,
  enqueueOutboxMock,
  encryptPayloadMock,
  transactionMock,
} = vi.hoisted(() => ({
  randomBytesMock: vi.fn(),
  lockIssuanceForEmailMock: vi.fn(),
  findActiveByEmailMock: vi.fn(),
  findPendingReplacementByEmailMock: vi.fn(),
  createMock: vi.fn(),
  findByIdMock: vi.fn(),
  resendIfCurrentMock: vi.fn(),
  replacePendingForEmailMock: vi.fn(),
  findByTokenHashMock: vi.fn(),
  markConsumedMock: vi.fn(),
  markConsumedIfTokenMatchesMock: vi.fn(),
  revokeIfCurrentMock: vi.fn(),
  listByTrainerMock: vi.fn(),
  listAllMock: vi.fn(),
  listPageMock: vi.fn(),
  sendActivationEmailMock: vi.fn(),
  hashMock: vi.fn(),
  findTrainerByIdMock: vi.fn(),
  createUserMock: vi.fn(),
  ensureFolderForStudentMock: vi.fn(),
  ensureStudentRoutineDirectoryMock: vi.fn(),
  findUserByEmailMock: vi.fn(),
  appendAuditMock: vi.fn(),
  enqueueOutboxMock: vi.fn(),
  encryptPayloadMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("bcryptjs", () => ({ hash: hashMock }));

vi.mock("@/features/invitations/repository", () => ({
  invitationRepository: {
    lockIssuanceForEmail: lockIssuanceForEmailMock,
    findActiveByEmail: findActiveByEmailMock,
    findPendingReplacementByEmail: findPendingReplacementByEmailMock,
    create: createMock,
    findById: findByIdMock,
    resendIfCurrent: resendIfCurrentMock,
    replacePendingForEmail: replacePendingForEmailMock,
    findByTokenHash: findByTokenHashMock,
    markConsumed: markConsumedMock,
    markConsumedIfTokenMatches: markConsumedIfTokenMatchesMock,
    revokeIfCurrent: revokeIfCurrentMock,
    listByTrainer: listByTrainerMock,
    listAll: listAllMock,
    list: listAllMock,
    listPage: listPageMock,
  },
}));

vi.mock("@/features/invitations/email", () => ({
  sendActivationEmail: sendActivationEmailMock,
}));

vi.mock("@/features/users/repository", () => ({
  userRepository: {
    findById: findTrainerByIdMock,
    findByEmail: findUserByEmailMock,
    create: createUserMock,
  },
}));

vi.mock("@/features/audit/repository", () => ({
  auditRepository: { append: appendAuditMock },
}));

vi.mock("@/features/outbox/repository", () => ({
  outboxRepository: { enqueue: enqueueOutboxMock },
}));

vi.mock("@/features/outbox/crypto", () => ({
  encryptPayload: encryptPayloadMock,
}));
vi.mock("@/features/payments/repository", () => ({
  paymentsRepository: { initializeCurrentPaymentForStudent: vi.fn().mockResolvedValue({ id: "cp-1" }) },
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
    $transaction: transactionMock,
  },
}));

import { invitationService } from "@/features/invitations/service";

describe("invitationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_URL = "http://localhost:3010";
    process.env.OUTBOX_ENCRYPTION_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    hashMock.mockResolvedValue("hashed-password");
    markConsumedIfTokenMatchesMock.mockResolvedValue(true);
    lockIssuanceForEmailMock.mockResolvedValue(undefined);
    findActiveByEmailMock.mockResolvedValue(null);
    findTrainerByIdMock.mockResolvedValue({ id: "c123456789012345678901234", role: "TRAINER", status: "ACTIVE" });
    findUserByEmailMock.mockResolvedValue(null);
    appendAuditMock.mockResolvedValue(undefined);
    enqueueOutboxMock.mockResolvedValue(undefined);
    encryptPayloadMock.mockReturnValue("encrypted-payload");
    transactionMock.mockImplementation(async (callback: (transaction: any) => Promise<unknown>) => callback({
      user: {}, trainerConfig: {}, currentPayment: {}, routineFolder: {}, invitation: {}, outboxMessage: {}, auditEvent: {},
    }));
  });

  it.each(["create", "resend", "replacement"] as const)("routes %s delivery through exchange with an encoded, hash-bound token", async (operation) => {
    const token = "fixture+/=?&#%token";
    const invitation = { id: "inv-link", email: "team@example.com", role: "TRAINER", status: "PENDING", version: 1, tokenHash: "previous-hash", expiresAt: new Date(Date.now() + 60_000) };
    createMock.mockResolvedValue(invitation);
    findByIdMock.mockResolvedValue(invitation);
    findPendingReplacementByEmailMock.mockResolvedValue(invitation);
    resendIfCurrentMock.mockResolvedValue(true);
    replacePendingForEmailMock.mockResolvedValue(true);
    const actor = { id: "admin-1", role: "ADMIN" } as any;

    let result: unknown;
    await randomBytesMock.withImplementation(() => ({ toString: () => token }), async () => {
      result = operation === "create"
        ? await invitationService.create(actor, { firstName: "Team", lastName: "Member", email: invitation.email, role: "TRAINER" })
        : operation === "resend"
          ? await invitationService.resend(invitation.id, actor, invitation.version)
          : await invitationService.requestReplacement(invitation.email);
    });

    const activationUrl = encryptPayloadMock.mock.calls[0][0].activationUrl;
    expect(activationUrl).toBe(`http://localhost:3010/activation/exchange?token=${encodeURIComponent(token)}`);
    expect(new URL(activationUrl).searchParams.get("token")).toBe(token);
    const persistenceMock = operation === "create" ? createMock : operation === "resend" ? resendIfCurrentMock : replacePendingForEmailMock;
    expect(persistenceMock.mock.calls[0][0].tokenHash).toBe(createHash("sha256").update(token).digest("hex"));
    expect(JSON.stringify({ result, audits: appendAuditMock.mock.calls, outbox: enqueueOutboxMock.mock.calls })).not.toContain(token);
    expect(sendActivationEmailMock).not.toHaveBeenCalled();
  });

  it("atomically issues a student invitation without creating a user or exposing its bearer", async () => {
    createMock.mockResolvedValue({
      id: "inv-1",
      email: "student@example.com",
      firstName: "Ana",
      lastName: "Gomez",
      trainerId: "c123456789012345678901234",
      status: "SENT",
      role: "STUDENT",
      deliveryStatus: "PENDING",
      version: 1,
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

    const transaction = createMock.mock.calls[0][1];
    expect(lockIssuanceForEmailMock).toHaveBeenCalledWith("student@example.com", transaction);
    expect(findUserByEmailMock).toHaveBeenCalledWith("student@example.com", transaction);
    expect(findActiveByEmailMock).toHaveBeenCalledWith("student@example.com", expect.any(Date), transaction);
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ email: "student@example.com", role: "STUDENT" }), expect.any(Object));
    expect(appendAuditMock).toHaveBeenCalledWith(expect.objectContaining({ eventType: "INVITATION_ISSUED" }), expect.any(Object));
    expect(enqueueOutboxMock).toHaveBeenCalledWith(expect.objectContaining({ messageType: "EMAIL", payloadEncrypted: "encrypted-payload" }), expect.any(Object));
    expect(sendActivationEmailMock).not.toHaveBeenCalled();
    expect(createUserMock).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty("tokenHash");
    expect(lockIssuanceForEmailMock.mock.invocationCallOrder[0]).toBeLessThan(findUserByEmailMock.mock.invocationCallOrder[0]);
    expect(findUserByEmailMock.mock.invocationCallOrder[0]).toBeLessThan(findActiveByEmailMock.mock.invocationCallOrder[0]);
    expect(findActiveByEmailMock.mock.invocationCallOrder[0]).toBeLessThan(createMock.mock.invocationCallOrder[0]);
    expect(createMock.mock.invocationCallOrder[0]).toBeLessThan(appendAuditMock.mock.invocationCallOrder[0]);
    expect(appendAuditMock.mock.invocationCallOrder[0]).toBeLessThan(enqueueOutboxMock.mock.invocationCallOrder[0]);
  });

  it("rejects an email with an active invitation without winner side effects", async () => {
    findActiveByEmailMock.mockResolvedValue({ id: "inv-existing", status: "SENT" });
    await expect(invitationService.create(
      { id: "c123456789012345678901234", role: "TRAINER" } as any,
      { firstName: "Ana", lastName: "Gomez", email: "student@example.com", trainerId: "c123456789012345678901234", initialPaymentStartDate: "2026-05-01" }
    )).rejects.toMatchObject({ status: 409, code: "CONFLICT" });

    expect(createMock).not.toHaveBeenCalled();
    expect(appendAuditMock).not.toHaveBeenCalled();
    expect(enqueueOutboxMock).not.toHaveBeenCalled();
    expect(sendActivationEmailMock).not.toHaveBeenCalled();
  });

  it("rejects an email reserved by a user inside the issuance transaction", async () => {
    findUserByEmailMock.mockResolvedValue({ id: "user-existing" });

    await expect(invitationService.create(
      { id: "c123456789012345678901234", role: "TRAINER" } as any,
      { firstName: "Ana", lastName: "Gomez", email: " Student@Example.com ", trainerId: "c123456789012345678901234", initialPaymentStartDate: "2026-05-01" }
    )).rejects.toMatchObject({ message: "Email is reserved", status: 409, code: "CONFLICT" });

    const transaction = findUserByEmailMock.mock.calls[0][1];
    expect(lockIssuanceForEmailMock).toHaveBeenCalledWith("student@example.com", transaction);
    expect(findActiveByEmailMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
    expect(appendAuditMock).not.toHaveBeenCalled();
    expect(enqueueOutboxMock).not.toHaveBeenCalled();
  });

  it("allows trainers to issue only student invitations in their own scope", async () => {
    await expect(
      invitationService.create(
        { id: "c123456789012345678901234", role: "TRAINER" } as any,
        { firstName: "Ana", lastName: "Gomez", email: "team@example.com", role: "ADMIN" } as any
      )
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });

    expect(createMock).not.toHaveBeenCalled();
  });

  it("allows an admin to issue a team invitation without student data", async () => {
    createMock.mockResolvedValue({ id: "inv-team", email: "team@example.com", role: "TRAINER", trainerId: null, status: "PENDING", deliveryStatus: "PENDING", expiresAt: new Date(), createdAt: new Date(), version: 1 });

    const result = await invitationService.create(
      { id: "admin-1", role: "ADMIN" } as any,
      { firstName: "Team", lastName: "Member", email: "team@example.com", role: "TRAINER" } as any
    );

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ role: "TRAINER", trainerId: null }), expect.any(Object));
    expect(result).not.toHaveProperty("tokenHash");
  });

  it("returns trainer-scoped safe queue DTOs", async () => {
    listAllMock.mockResolvedValue([{ id: "inv-1", email: "student@example.com", role: "STUDENT", trainerId: "trainer-1", status: "PENDING", deliveryStatus: "PENDING", expiresAt: new Date(), createdAt: new Date(), version: 1, tokenHash: "not-for-dto" }]);

    const result = await invitationService.listForActor({ id: "trainer-1", role: "TRAINER" } as any);

    expect(listAllMock).toHaveBeenCalledWith({ trainerId: "trainer-1", role: "STUDENT" });
    expect(result[0]).not.toHaveProperty("tokenHash");
  });

  it("atomically resends a current invitation with a rotated bearer and encrypted delivery", async () => {
    findByIdMock.mockResolvedValue({
      id: "inv-1",
      trainerId: "c123456789012345678901234",
      email: "student@example.com",
      firstName: "Ana",
      lastName: "Gomez",
      status: "SENT",
      role: "STUDENT",
      version: 3,
      expiresAt: new Date(Date.now() + 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    resendIfCurrentMock.mockResolvedValue(true);

    const result = await invitationService.resend("inv-1", { id: "c123456789012345678901234", role: "TRAINER" } as any, 3);

    expect(resendIfCurrentMock).toHaveBeenCalledWith(expect.objectContaining({ invitationId: "inv-1", expectedVersion: 3, deliveryStatus: "PENDING" }), expect.any(Object));
    expect(appendAuditMock).toHaveBeenCalledWith(expect.objectContaining({ eventType: "INVITATION_RESENT" }), expect.any(Object));
    expect(enqueueOutboxMock).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: "invitation:inv-1:resend:4", payloadEncrypted: "encrypted-payload" }), expect.any(Object));
    const transaction = resendIfCurrentMock.mock.calls[0][1];
    expect(appendAuditMock.mock.calls[0][1]).toBe(transaction);
    expect(enqueueOutboxMock.mock.calls[0][1]).toBe(transaction);
    expect(sendActivationEmailMock).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty("tokenHash");
  });

  const replacementHarness = () => {
    let committed = {
      invitation: { id: "inv-1", email: "student@example.com", status: "PENDING", tokenHash: "previous-hash", version: 3 },
      audits: [] as unknown[], outbox: [] as unknown[],
    };
    let queue = Promise.resolve();
    transactionMock.mockImplementation((callback) => {
      const operation = queue.then(async () => {
        const staged = structuredClone(committed);
        const result = await callback({ staged });
        committed = staged;
        return result;
      });
      queue = operation.catch(() => undefined);
      return operation;
    });
    findPendingReplacementByEmailMock.mockImplementation(async (email) =>
      committed.invitation.email === email && committed.invitation.status === "PENDING" && committed.invitation.tokenHash
        ? structuredClone(committed.invitation) : null
    );
    replacePendingForEmailMock.mockImplementation(async (input, transaction) => {
      const invitation = transaction.staged.invitation;
      if (invitation.id !== input.invitationId || invitation.version !== input.expectedVersion || invitation.status !== "PENDING" || invitation.tokenHash !== input.expectedTokenHash) return false;
      Object.assign(invitation, { tokenHash: input.tokenHash, expiresAt: input.expiresAt, deliveryStatus: "PENDING", version: invitation.version + 1 });
      return true;
    });
    appendAuditMock.mockImplementation(async (event, transaction) => { transaction.staged.audits.push(event); });
    enqueueOutboxMock.mockImplementation(async (message, transaction) => { transaction.staged.outbox.push(message); });
    return () => committed;
  };

  it("looks up normalized pending invitations and CAS-binds the observed identity and bearer hash", async () => {
    const state = replacementHarness();
    let encryptedPayload: any;
    encryptPayloadMock.mockImplementation((payload) => { encryptedPayload = payload; return "encrypted-payload"; });

    await invitationService.requestReplacement(" Student@Example.com ");

    const rawToken = new URL(encryptedPayload.activationUrl).searchParams.get("token")!;
    const command = replacePendingForEmailMock.mock.calls[0][0];
    expect(findPendingReplacementByEmailMock).toHaveBeenCalledWith("student@example.com");
    expect(command).toMatchObject({ invitationId: "inv-1", expectedVersion: 3, expectedTokenHash: "previous-hash" });
    expect(command.tokenHash).toBe(createHash("sha256").update(rawToken).digest("hex"));
    expect(JSON.stringify(command)).not.toContain(rawToken);
    expect(state().audits).toHaveLength(1);
    expect(state().outbox).toHaveLength(1);
  });

  it("commits one rotation, audit, and outbox message for concurrent replayed observations", async () => {
    const state = replacementHarness();

    await Promise.all([
      invitationService.requestReplacement("student@example.com"),
      invitationService.requestReplacement("student@example.com"),
    ]);

    expect(replacePendingForEmailMock).toHaveBeenCalledTimes(2);
    expect(state().invitation.version).toBe(4);
    expect(state().audits).toHaveLength(1);
    expect(state().outbox).toHaveLength(1);
  });

  it.each(["audit", "outbox"])("rolls back the staged replacement when %s persistence fails", async (failure) => {
    const state = replacementHarness();
    if (failure === "audit") appendAuditMock.mockRejectedValue(new Error("audit failed"));
    else enqueueOutboxMock.mockRejectedValue(new Error("outbox failed"));

    await expect(invitationService.requestReplacement("student@example.com")).rejects.toThrow(`${failure} failed`);

    expect(state().invitation).toMatchObject({ tokenHash: "previous-hash", version: 3 });
    expect(state().audits).toEqual([]);
    expect(state().outbox).toEqual([]);
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

  it("rejects stale or terminal resend commands without audit or delivery work", async () => {
    findByIdMock.mockResolvedValue({ id: "inv-1", trainerId: "c123456789012345678901234", role: "STUDENT", status: "CONSUMED", version: 3, expiresAt: new Date(Date.now() + 1000) });

    await expect(invitationService.resend("inv-1", { id: "c123456789012345678901234", role: "TRAINER" } as any, 3)).rejects.toMatchObject({ status: 409, code: "CONFLICT" });

    expect(resendIfCurrentMock).not.toHaveBeenCalled();
    expect(appendAuditMock).not.toHaveBeenCalled();
    expect(enqueueOutboxMock).not.toHaveBeenCalled();
  });

  it("rejects a lost resend CAS without audit or delivery work", async () => {
    findByIdMock.mockResolvedValue({ id: "inv-1", trainerId: "c123456789012345678901234", email: "student@example.com", role: "STUDENT", status: "SENT", version: 3, expiresAt: new Date(Date.now() + 1000) });
    resendIfCurrentMock.mockResolvedValue(false);

    await expect(invitationService.resend("inv-1", { id: "c123456789012345678901234", role: "TRAINER" } as any, 3)).rejects.toMatchObject({ status: 409, code: "CONFLICT" });

    expect(appendAuditMock).not.toHaveBeenCalled();
    expect(enqueueOutboxMock).not.toHaveBeenCalled();
  });

  it("binds the rotated raw token to its CAS hash and encrypted payload only", async () => {
    findByIdMock.mockResolvedValue({ id: "inv-1", trainerId: "c123456789012345678901234", email: "student@example.com", role: "STUDENT", status: "SENT", version: 3, expiresAt: new Date(Date.now() + 1000) });
    resendIfCurrentMock.mockResolvedValue(true);
    let encryptedPayload: any;
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);
    encryptPayloadMock.mockImplementation((payload) => { encryptedPayload = payload; return "encrypted-payload"; });

    const result = await invitationService.resend("inv-1", { id: "c123456789012345678901234", role: "TRAINER" } as any, 3);
    const activationUrl = encryptedPayload.activationUrl as string;
    const rawToken = new URL(activationUrl).searchParams.get("token")!;
    const casInput = resendIfCurrentMock.mock.calls[0][0];

    expect(casInput.tokenHash).toBe(createHash("sha256").update(rawToken).digest("hex"));
    expect(JSON.stringify(casInput)).not.toContain(rawToken);
    expect(JSON.stringify(appendAuditMock.mock.calls[0][0])).not.toContain(rawToken);
    expect(JSON.stringify(result)).not.toContain(rawToken);
    expect(consoleInfo).not.toHaveBeenCalled();
    consoleInfo.mockRestore();
  });

  it.each(["audit", "outbox"])("rolls back staged resend mutation when %s persistence fails", async (failure) => {
    findByIdMock.mockResolvedValue({ id: "inv-1", trainerId: "c123456789012345678901234", email: "student@example.com", role: "STUDENT", status: "SENT", version: 3, expiresAt: new Date(Date.now() + 1000) });
    const committed: string[] = [];
    transactionMock.mockImplementation(async (callback) => {
      const staged: string[] = [];
      try { const result = await callback({ stage: (effect: string) => staged.push(effect) }); committed.push(...staged); return result; }
      finally { staged.length = 0; }
    });
    resendIfCurrentMock.mockImplementation(async (_input, transaction) => { transaction.stage("mutation"); return true; });
    if (failure === "audit") appendAuditMock.mockRejectedValue(new Error("audit failed"));
    else enqueueOutboxMock.mockRejectedValue(new Error("outbox failed"));

    await expect(invitationService.resend("inv-1", { id: "c123456789012345678901234", role: "TRAINER" } as any, 3)).rejects.toThrow(`${failure} failed`);

    expect(committed).toEqual([]);
    if (failure === "audit") expect(enqueueOutboxMock).not.toHaveBeenCalled();
  });

  it("revokes only a current eligible invitation inside its audit transaction", async () => {
    findByIdMock.mockResolvedValue({ id: "inv-1", trainerId: "c123456789012345678901234", role: "STUDENT", status: "SENT", version: 3, expiresAt: new Date(Date.now() + 1000) });
    revokeIfCurrentMock.mockResolvedValue(true);

    await invitationService.revoke("inv-1", { id: "c123456789012345678901234", role: "TRAINER" } as any, { expectedVersion: 3, reason: "Duplicate request" });

    expect(revokeIfCurrentMock).toHaveBeenCalledWith(expect.objectContaining({ invitationId: "inv-1", expectedVersion: 3 }), expect.any(Object));
    expect(appendAuditMock).toHaveBeenCalledWith(expect.objectContaining({ eventType: "INVITATION_REVOKED", reason: "Duplicate request" }), expect.any(Object));
    expect(enqueueOutboxMock).not.toHaveBeenCalled();
  });

  it("rejects a lost revoke CAS without audit or delivery work", async () => {
    findByIdMock.mockResolvedValue({ id: "inv-1", trainerId: "c123456789012345678901234", role: "STUDENT", status: "SENT", version: 3, expiresAt: new Date(Date.now() + 1000) });
    revokeIfCurrentMock.mockResolvedValue(false);

    await expect(invitationService.revoke("inv-1", { id: "c123456789012345678901234", role: "TRAINER" } as any, { expectedVersion: 3, reason: "Duplicate request" })).rejects.toMatchObject({ status: 409, code: "CONFLICT" });

    expect(appendAuditMock).not.toHaveBeenCalled();
    expect(enqueueOutboxMock).not.toHaveBeenCalled();
  });

  it("rolls back staged revoke mutation when its audit fails", async () => {
    findByIdMock.mockResolvedValue({ id: "inv-1", trainerId: "c123456789012345678901234", role: "STUDENT", status: "SENT", version: 3, expiresAt: new Date(Date.now() + 1000) });
    const committed: string[] = [];
    transactionMock.mockImplementation(async (callback) => {
      const staged: string[] = [];
      try { const result = await callback({ stage: (effect: string) => staged.push(effect) }); committed.push(...staged); return result; }
      finally { staged.length = 0; }
    });
    revokeIfCurrentMock.mockImplementation(async (_input, transaction) => { transaction.stage("mutation"); return true; });
    appendAuditMock.mockRejectedValue(new Error("audit failed"));

    await expect(invitationService.revoke("inv-1", { id: "c123456789012345678901234", role: "TRAINER" } as any, { expectedVersion: 3, reason: "Duplicate request" })).rejects.toThrow("audit failed");

    expect(committed).toEqual([]);
    expect(enqueueOutboxMock).not.toHaveBeenCalled();
  });

  it("keeps trainers out of team invitation actions", async () => {
    findByIdMock.mockResolvedValue({ id: "inv-team", trainerId: null, role: "ADMIN", status: "SENT", version: 3, expiresAt: new Date(Date.now() + 1000) });

    await expect(invitationService.revoke("inv-team", { id: "trainer-1", role: "TRAINER" } as any, { expectedVersion: 3, reason: "No longer needed" })).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });

    expect(revokeIfCurrentMock).not.toHaveBeenCalled();
  });

  it("binds trainer queue pages to owned student invitations", async () => {
    listPageMock.mockResolvedValue({ items: [{ id: "inv-1", email: "ana@example.com", role: "STUDENT", trainerId: "trainer-1", status: "PENDING", deliveryStatus: "PENDING", expiresAt: new Date(), createdAt: new Date(), version: 1 }], nextCursor: "signed" });

    await expect(invitationService.listPageForActor({ id: "trainer-1", role: "TRAINER" } as any, { limit: 25 })).resolves.toMatchObject({ nextCursor: "signed", items: [{ id: "inv-1" }] });

    expect(listPageMock).toHaveBeenCalledWith(expect.objectContaining({ trainerId: "trainer-1", roles: ["STUDENT"], limit: 25 }));
    await expect(invitationService.listPageForActor({ id: "trainer-1", role: "TRAINER" } as any, { role: "ADMIN", limit: 25 })).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });
});
