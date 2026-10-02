import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  upsertMock,
  findUniqueMock,
  findManyMock,
  updateMock,
  createMock,
} = vi.hoisted(() => ({
  upsertMock: vi.fn(),
  findUniqueMock: vi.fn(),
  findManyMock: vi.fn(),
  updateMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invitation: {
      upsert: upsertMock,
      findUnique: findUniqueMock,
      findMany: findManyMock,
      update: updateMock,
      create: createMock,
    },
  },
}));

import { invitationRepository } from "@/features/invitations/repository";

describe("invitationRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates invitation record", async () => {
    createMock.mockResolvedValue({ id: "inv-1" });

    await invitationRepository.create({
      email: "student@example.com",
      tokenHash: "hash",
      expiresAt: new Date(),
      trainerId: "c123456789012345678901234",
      firstName: "Ana",
      lastName: "Gomez",
    });

    expect(createMock).toHaveBeenCalledWith({ data: expect.objectContaining({ email: "student@example.com", tokenHash: "hash" }) });
  });

  it("acquires a transaction-scoped advisory lock with a parameterized tagged template", async () => {
    const executeRaw = vi.fn().mockResolvedValue(0);
    const email = "student@example.com";

    await invitationRepository.lockIssuanceForEmail(email, { $executeRaw: executeRaw });

    expect(executeRaw).toHaveBeenCalledOnce();
    const [strings, value] = executeRaw.mock.calls[0];
    expect(Array.from(strings)).toEqual(["SELECT pg_advisory_xact_lock(hashtext(", "))"]);
    expect(value).toBe(email);
    expect(Array.from(strings).join("")).not.toContain(email);
  });

  it("finds only usable invitations with the supplied transaction and clock", async () => {
    const now = new Date("2026-09-27T12:00:00.000Z");
    const findFirst = vi.fn().mockResolvedValue({ id: "inv-active" });
    const transaction = { invitation: { findFirst } };

    await invitationRepository.findActiveByEmail("student@example.com", now, transaction as any);

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        email: "student@example.com",
        status: { in: ["PENDING", "SENT"] },
        tokenHash: { not: null },
        expiresAt: { gt: now },
      },
    });
  });

  it("looks up invitation by token hash", async () => {
    findUniqueMock.mockResolvedValue({ id: "inv-1" });

    await invitationRepository.findByTokenHash("hash");

    expect(findUniqueMock).toHaveBeenCalledWith({ where: { tokenHash: "hash" } });
  });

  it("marks invitation consumed by clearing token", async () => {
    updateMock.mockResolvedValue({ id: "inv-1", status: "CONSUMED" });

    await invitationRepository.markConsumed("inv-1");

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv-1" },
        data: expect.objectContaining({ status: "CONSUMED", tokenHash: null }),
      })
    );
  });

  it("atomically renews expired invitations without requiring an unexpired timestamp", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const now = new Date("2026-10-01T00:00:00.000Z");
    const expiresAt = new Date("2026-10-03T00:00:00.000Z");

    await invitationRepository.resendIfCurrent({
      invitationId: "inv-expired",
      expectedVersion: 4,
      now,
      tokenHash: "new-hash",
      expiresAt,
      deliveryStatus: "PENDING",
    }, { invitation: { updateMany } } as any);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "inv-expired",
        version: 4,
        status: { in: ["PENDING", "SENT", "EXPIRED"] },
        tokenHash: { not: null },
      },
      data: {
        status: "PENDING",
        tokenHash: "new-hash",
        expiresAt,
        deliveryStatus: "PENDING",
        version: { increment: 1 },
      },
    });
  });

  it("uses a signed cursor bound to queue scope and stable descending ordering", async () => {
    process.env.NEXTAUTH_SECRET = "invitation-queue-test-secret";
    const invitation = { id: "inv-1", email: "ana@example.com", role: "STUDENT", trainerId: "trainer-1", status: "PENDING", deliveryStatus: "PENDING", expiresAt: new Date(), createdAt: new Date("2026-01-01T00:00:00.000Z"), version: 1 };
    findManyMock.mockResolvedValueOnce([invitation, { ...invitation, id: "inv-2" }]).mockResolvedValueOnce([invitation]);
    const query = { roles: ["STUDENT"] as const, trainerId: "trainer-1", status: "PENDING" as const, limit: 1 };

    const firstPage = await invitationRepository.listPage(query);
    await invitationRepository.listPage({ ...query, cursor: firstPage.nextCursor ?? undefined });

    expect(firstPage.nextCursor).toContain(".");
    expect(findManyMock).toHaveBeenLastCalledWith(expect.objectContaining({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 2,
      where: expect.objectContaining({ trainerId: "trainer-1", role: { in: ["STUDENT"] }, status: "PENDING" }),
    }));
    await expect(invitationRepository.listPage({ ...query, status: "SENT", cursor: firstPage.nextCursor ?? undefined })).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
  });
});
