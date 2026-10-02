import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { createUserMock, appendAuditMock, enqueueMock } = vi.hoisted(() => ({
  createUserMock: vi.fn(), appendAuditMock: vi.fn(), enqueueMock: vi.fn(),
}));

vi.mock("@/features/users/repository", () => ({ userRepository: { create: createUserMock } }));
vi.mock("@/features/audit/repository", () => ({ auditRepository: { append: appendAuditMock } }));
vi.mock("@/features/outbox/repository", () => ({ outboxRepository: { enqueue: enqueueMock } }));
vi.mock("@/features/outbox/crypto", () => ({ encryptPayload: vi.fn(() => "encrypted-provisioning") }));

import { ActivationPrimitives } from "./activation";

const now = new Date("2026-09-20T12:00:00.000Z");
const token = "invite-bearer";
const session = "activation-session";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

type State = any;
let state: State;

const invitation = (role = "STUDENT", overrides: Record<string, unknown> = {}) => ({
  id: "invitation-1", email: "student@example.com", role, firstName: "Ada", lastName: "Lovelace",
  trainerId: role === "STUDENT" ? "trainer-1" : null, status: "PENDING", version: 1, tokenHash: digest(token),
  expiresAt: new Date("2026-09-21T12:00:00.000Z"), phone: null, birthDate: null, gender: null, heightCm: null, weightKg: null,
  initialPaymentStartDate: null, ...overrides,
});

const initial = (role?: string, overrides?: Record<string, unknown>) => ({
  invitation: invitation(role, overrides), sessions: [], users: [], profiles: [], debts: [], audits: [], outbox: [],
  failInvitationConsume: false, failAudit: false, failOutbox: false,
});

const isEligible = (item: any, where: any) =>
  item && item.tokenHash === where.tokenHash && where.status.in.includes(item.status) && item.expiresAt > where.expiresAt.gt;

const transaction = (staged: State) => ({
  state: staged,
  invitation: {
    findFirst: async ({ where }: any) => isEligible(staged.invitation, where) ? structuredClone(staged.invitation) : null,
    updateMany: async ({ where, data }: any) => {
      const current = staged.invitation;
      const matches = current.id === where.id && current.tokenHash === where.tokenHash && where.status.in.includes(current.status) && current.expiresAt > where.expiresAt.gt;
      if (!matches || (data.status === "CONSUMED" && staged.failInvitationConsume)) return { count: 0 };
      Object.assign(current, data, { version: current.version + (data.version?.increment ?? 0) });
      return { count: 1 };
    },
  },
  activationSession: {
    create: async ({ data }: any) => (staged.sessions.push({ id: `session-${staged.sessions.length + 1}`, consumedAt: null, ...data }), data),
    findFirst: async ({ where }: any) => {
      const item = staged.sessions.find((entry: any) => entry.sessionHash === where.sessionHash && entry.consumedAt === null && entry.expiresAt > where.expiresAt.gt);
      const invitationWhere = where.invitation;
      return item && isEligible(staged.invitation, invitationWhere) ? { ...structuredClone(item), invitation: structuredClone(staged.invitation) } : null;
    },
    updateMany: async ({ where, data }: any) => {
      const item = staged.sessions.find((entry: any) => entry.id === where.id && entry.sessionHash === where.sessionHash && entry.consumedAt === null && entry.expiresAt > where.expiresAt.gt);
      if (!item) return { count: 0 };
      Object.assign(item, data);
      return { count: 1 };
    },
  },
  paymentConfig: {
    findUniqueOrThrow: async () => ({ id: "GLOBAL", defaultMonthlyAmountInCents: 3_000_000, version: 1 }),
  },
  currentPayment: {
    create: async ({ data }: any) => {
      const payment = { id: `payment-${staged.debts.length + 1}`, ...data };
      staged.debts.push(payment);
      return payment;
    },
  },
});

const database = {
  $transaction: async <T>(operation: (tx: any) => Promise<T>) => {
    const staged = structuredClone(state);
    const result = await operation(transaction(staged));
    state = staged;
    return result;
  },
};

const primitive = () => new ActivationPrimitives(() => now, () => session, database);
const activate = () => primitive().activate({ session, password: "Password1" });
const effects = () => ({ users: state.users, profiles: state.profiles, debts: state.debts, audits: state.audits, outbox: state.outbox });

describe("activation primitives staged transaction harness", () => {
  beforeEach(() => {
    state = initial();
    vi.clearAllMocks();
    vi.stubEnv("OUTBOX_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64url"));
    createUserMock.mockImplementation(async (input: any, tx: any) => {
      const user: any = { id: `user-${tx.state.users.length + 1}`, role: input.role, email: input.email, studentProfile: null };
      tx.state.users.push(user);
      if (input.studentProfile) {
        user.studentProfile = { id: `profile-${tx.state.profiles.length + 1}`, trainerId: input.studentProfile.trainerId };
        tx.state.profiles.push(user.studentProfile);
      }
      return user;
    });
    appendAuditMock.mockImplementation(async (event: any, tx: any) => {
      if (tx.state.failAudit) throw new Error("audit unavailable");
      tx.state.audits.push(event);
    });
    enqueueMock.mockImplementation(async (message: any, tx: any) => {
      if (tx.state.failOutbox) throw new Error("outbox unavailable");
      tx.state.outbox.push(message);
    });
  });

  it("commits one exchanged session and rejects raw invitation replay without retaining the bearer", async () => {
    await expect(primitive().exchange(token)).resolves.toEqual({ session });
    await expect(primitive().exchange(token)).rejects.toMatchObject({ code: "INVALID_OR_EXPIRED_TOKEN" });

    expect(state.sessions).toHaveLength(1);
    expect(state.invitation.tokenHash).toBe(digest(session));
    expect(JSON.stringify(state)).not.toContain(token);
  });

  it.each(["unknown", "expired", "revoked", "consumed"])("discards %s exchange state without mutation", async (kind) => {
    state = initial("STUDENT", kind === "expired" ? { expiresAt: now } : kind === "unknown" ? { tokenHash: digest("other") } : { status: kind.toUpperCase(), tokenHash: null });
    const before = structuredClone(state);

    await expect(primitive().exchange(token)).rejects.toMatchObject({ code: "INVALID_OR_EXPIRED_TOKEN" });
    expect(state).toEqual(before);
  });

  it("rejects sessions invalidated by resend rotation or revoke", async () => {
    await primitive().exchange(token);
    state.invitation.tokenHash = digest("resend-token");
    await expect(activate()).rejects.toMatchObject({ code: "INVALID_OR_EXPIRED_TOKEN" });
    expect(effects()).toEqual({ users: [], profiles: [], debts: [], audits: [], outbox: [] });

    state.invitation.tokenHash = null;
    state.invitation.status = "REVOKED";
    await expect(activate()).rejects.toMatchObject({ code: "INVALID_OR_EXPIRED_TOKEN" });
    expect(state.sessions[0].consumedAt).toBeNull();
  });

  it("discards staged session consumption when the invitation CAS loses", async () => {
    await primitive().exchange(token);
    state.failInvitationConsume = true;

    await expect(activate()).rejects.toMatchObject({ code: "INVALID_OR_EXPIRED_TOKEN" });
    expect(state.sessions[0].consumedAt).toBeNull();
    expect(effects()).toEqual({ users: [], profiles: [], debts: [], audits: [], outbox: [] });
  });

  it.each(["audit", "outbox"])("discards all staged state when %s persistence fails", async (failure) => {
    await primitive().exchange(token);
    state[failure === "audit" ? "failAudit" : "failOutbox"] = true;
    const before = structuredClone(state);

    await expect(activate()).rejects.toThrow(failure === "audit" ? "audit unavailable" : "outbox unavailable");
    expect(state).toEqual(before);
  });

  it.each(["ADMIN", "TRAINER", "STUDENT"] as const)("commits only invited %s state", async (role) => {
    state = initial(role);
    await primitive().exchange(token);
    await expect(activate()).resolves.toEqual({ userId: "user-1" });

    expect(state.users[0].role).toBe(role);
    expect(state.profiles).toHaveLength(role === "STUDENT" ? 1 : 0);
    expect(state.debts).toHaveLength(role === "STUDENT" ? 1 : 0);
    expect(state.outbox).toHaveLength(role === "STUDENT" ? 1 : 0);
    expect(state.audits).toHaveLength(role === "STUDENT" ? 2 : 1);
    await expect(activate()).rejects.toMatchObject({ code: "INVALID_OR_EXPIRED_TOKEN" });
  });
});
