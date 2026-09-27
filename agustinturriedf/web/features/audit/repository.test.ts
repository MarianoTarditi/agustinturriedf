import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/http/api-response";

const { requireSessionMock, prismaMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  prismaMock: {
    user: { findUnique: vi.fn() },
    auditEvent: { create: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/features/auth/session", () => ({ requireSession: requireSessionMock }));

import { GET } from "@/app/api/users/[userId]/audit/route";
import { buildAuditEvent } from "@/features/audit/event-factory";
import { AuditRepository } from "@/features/audit/repository";

const subjectId = "c123456789012345678901234";
const context = { params: Promise.resolve({ userId: subjectId }) };
const repository = new AuditRepository();

describe("audit repository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("appends one attributed event through a caller-supplied transaction", async () => {
    const transaction = { auditEvent: { create: vi.fn().mockResolvedValue({ id: "event-1" }) } };
    const event = buildAuditEvent({
      eventType: "PROFILE_UPDATED",
      subjectUserId: subjectId,
      invitationId: "invitation-1",
      actor: { type: "USER", userId: "admin-1" },
      reason: "Correct contact details",
      summary: { changedFields: ["phone"], password: "not-recorded" },
    });

    await repository.append(event, transaction);

    expect(transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: "PROFILE_UPDATED",
        subjectUserId: subjectId,
        invitationId: "invitation-1",
        actorType: "USER",
        actorUserId: "admin-1",
        reason: "Correct contact details",
        summary: { changedFields: ["phone"] },
      }),
    });
  });

  it("does not retain an audit event when its caller rolls back the transaction", async () => {
    const committed: unknown[] = [];
    const runTransaction = async (operation: (transaction: { auditEvent: { create: (input: { data: unknown }) => Promise<unknown> } }) => Promise<void>) => {
      const staged: unknown[] = [];
      try {
        await operation({ auditEvent: { create: async ({ data }) => (staged.push(data), data) } });
        committed.push(...staged);
      } catch {
        // A database transaction discards its local writes when its caller aborts.
      }
    };

    await runTransaction(async (transaction) => {
      await repository.append(
        buildAuditEvent({
          eventType: "ACCOUNT_ARCHIVED",
          subjectUserId: subjectId,
          actor: { type: "SYSTEM" },
          reason: "Scheduled retention policy",
        }),
        transaction
      );
      throw new Error("abort mutation");
    });

    expect(committed).toEqual([]);
  });

  it("attributes subject actions without retaining secret-bearing summary fields", () => {
    const event = buildAuditEvent({
      eventType: "ACTIVATION_COMPLETED",
      subjectUserId: subjectId,
      invitationId: "invitation-1",
      actor: { type: "SUBJECT", userId: subjectId },
      summary: { resourceType: "invitation", tokenHash: "never-persisted" },
    });

    expect(event).toMatchObject({
      actorType: "SUBJECT",
      actorUserId: subjectId,
      subjectUserId: subjectId,
      invitationId: "invitation-1",
      summary: { resourceType: "invitation" },
    });
    expect(event.summary).not.toHaveProperty("tokenHash");
  });

  it("rejects subject attribution when the actor differs from the subject", () => {
    expect(() =>
      buildAuditEvent({
        eventType: "ACTIVATION_COMPLETED",
        subjectUserId: subjectId,
        actor: { type: "SUBJECT", userId: "another-user" },
      })
    ).toThrow("Subject actor must match the subject user");
  });

  it("rejects secret-bearing reasons and omits secret-bearing allowlisted summary values", () => {
    expect(() =>
      buildAuditEvent({
        eventType: "PASSWORD_RESET_REQUESTED",
        subjectUserId: subjectId,
        actor: { type: "SYSTEM" },
        reason: "passwordHash=argon2-secret tokenHash=deadbeef Authorization Bearer raw-secret",
      })
    ).toThrow("Audit content must not contain secrets");

    const event = buildAuditEvent({
      eventType: "PASSWORD_RESET_REQUESTED",
      subjectUserId: subjectId,
      actor: { type: "SYSTEM" },
      summary: { resourceType: "tokenHash=deadbeef", fromStatus: "INACTIVE" },
    });

    expect(event.summary).toEqual({ fromStatus: "INACTIVE" });
  });

  it("returns bounded chronological history and denies trainer team history", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ id: subjectId, role: "STUDENT" })
      .mockResolvedValueOnce({ id: subjectId, role: "ADMIN" });
    prismaMock.auditEvent.findMany.mockResolvedValue([
      { id: "event-1", createdAt: new Date("2026-09-17T10:00:00.000Z"), summary: { changedFields: ["email"] } },
    ]);

    const history = await repository.listForActor({ id: "trainer-1", role: "TRAINER" }, subjectId, { limit: 25 });

    expect(history).toEqual({
      items: [{ id: "event-1", createdAt: new Date("2026-09-17T10:00:00.000Z"), summary: { changedFields: ["email"] } }],
      nextCursor: null,
    });
    expect(prismaMock.auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 26, orderBy: [{ createdAt: "asc" }, { id: "asc" }] })
    );
    await expect(
      repository.listForActor({ id: "trainer-1", role: "TRAINER" }, subjectId, { limit: 25 })
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" } satisfies Partial<ApiError>);
  });

  it("binds a next cursor to the audited subject and stable chronological sort", async () => {
    vi.stubEnv("NEXTAUTH_SECRET", "audit-test-secret");
    prismaMock.user.findUnique.mockResolvedValue({ id: subjectId, role: "STUDENT" });
    prismaMock.auditEvent.findMany.mockResolvedValue(
      Array.from({ length: 26 }, (_, index) => ({
        id: `event-${index + 1}`,
        createdAt: new Date(`2026-09-17T10:${String(index).padStart(2, "0")}:00.000Z`),
        summary: {},
      }))
    );

    const history = await repository.listForActor({ id: "admin-1", role: "ADMIN" }, subjectId, { limit: 25 });

    expect(history.items).toHaveLength(25);
    expect(history.nextCursor).toMatch(/^[^.]+\.[^.]+$/);
    vi.unstubAllEnvs();
  });

  it("rejects a signed cursor with extra segments before querying events", async () => {
    vi.stubEnv("NEXTAUTH_SECRET", "audit-test-secret");
    prismaMock.user.findUnique.mockResolvedValue({ id: subjectId, role: "STUDENT" });
    const payload = Buffer.from(
      JSON.stringify({ subjectUserId: subjectId, sort: "createdAt:asc,id:asc", createdAt: "2026-09-17T10:00:00.000Z", id: "event-1" })
    ).toString("base64url");
    const signature = createHmac("sha256", "audit-test-secret").update(payload).digest("base64url");

    await expect(
      repository.listForActor({ id: "admin-1", role: "ADMIN" }, subjectId, {
        cursor: `${payload}.${signature}.extra`,
      })
    ).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" } satisfies Partial<ApiError>);

    expect(prismaMock.auditEvent.findMany).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("returns 403 without event disclosure when a trainer requests team history", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });
    prismaMock.user.findUnique.mockResolvedValue({ id: subjectId, role: "TRAINER" });

    const response = await GET(new Request(`http://localhost/api/users/${subjectId}/audit`), context);

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ success: false, error: { code: "FORBIDDEN" } });
    expect(prismaMock.auditEvent.findMany).not.toHaveBeenCalled();
  });
});
