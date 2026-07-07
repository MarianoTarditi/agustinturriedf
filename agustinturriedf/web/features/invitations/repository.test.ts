import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  upsertMock,
  findUniqueMock,
  findManyMock,
  updateMock,
} = vi.hoisted(() => ({
  upsertMock: vi.fn(),
  findUniqueMock: vi.fn(),
  findManyMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invitation: {
      upsert: upsertMock,
      findUnique: findUniqueMock,
      findMany: findManyMock,
      update: updateMock,
    },
  },
}));

import { invitationRepository } from "@/features/invitations/repository";

describe("invitationRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates invitation record", async () => {
    upsertMock.mockResolvedValue({ id: "inv-1" });

    await invitationRepository.create({
      email: "student@example.com",
      tokenHash: "hash",
      expiresAt: new Date(),
      trainerId: "c123456789012345678901234",
      firstName: "Ana",
      lastName: "Gomez",
    });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "student@example.com" },
        create: expect.objectContaining({ email: "student@example.com" }),
        update: expect.objectContaining({ tokenHash: "hash", status: "SENT" }),
      })
    );
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
});
