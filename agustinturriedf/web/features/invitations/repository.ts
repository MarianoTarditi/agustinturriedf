import { prisma } from "@/lib/prisma";

const prismaInvitations = prisma as any;

export type CreateInvitationRepositoryInput = {
  email: string;
  role?: "ADMIN" | "TRAINER" | "STUDENT";
  tokenHash: string;
  expiresAt: Date;
  trainerId?: string | null;
  firstName: string;
  lastName: string;
  phone?: string | null;
  birthDate?: Date | null;
  gender?: "MALE" | "FEMALE" | "NON_BINARY" | "OTHER" | null;
  heightCm?: number | null;
  weightKg?: number | null;
  initialPaymentStartDate?: Date | null;
  status?: "PENDING" | "SENT" | "CONSUMED" | "EXPIRED" | "REVOKED";
};

type VersionedInvitationCommand = {
  invitationId: string;
  expectedVersion: number;
  now: Date;
};

export class InvitationRepository {
  async create(input: CreateInvitationRepositoryInput, transaction = prismaInvitations) {
    return transaction.invitation.create({ data: input });
  }

  async findByEmail(email: string) {
    return prismaInvitations.invitation.findFirst({ where: { email } });
  }

  async findPendingReplacementByEmail(email: string) {
    return prismaInvitations.invitation.findFirst({
      where: { email, status: "PENDING", tokenHash: { not: null } },
    });
  }

  async findByTokenHash(tokenHash: string) {
    return prismaInvitations.invitation.findUnique({ where: { tokenHash } });
  }

  async findById(invitationId: string) {
    return prismaInvitations.invitation.findUnique({ where: { id: invitationId } });
  }

  async listByTrainer(trainerId: string) {
    return prismaInvitations.invitation.findMany({
      where: { trainerId },
      orderBy: { createdAt: "desc" },
    });
  }

  async listAll() {
    return prismaInvitations.invitation.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async list(input: { trainerId?: string; role?: "ADMIN" | "TRAINER" | "STUDENT"; status?: CreateInvitationRepositoryInput["status"] } = {}) {
    return prismaInvitations.invitation.findMany({
      where: { ...(input.trainerId ? { trainerId: input.trainerId } : {}), ...(input.role ? { role: input.role } : {}), ...(input.status ? { status: input.status } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, email: true, role: true, trainerId: true, status: true, deliveryStatus: true, expiresAt: true, createdAt: true, version: true },
    });
  }

  async resendIfCurrent(input: VersionedInvitationCommand & { tokenHash: string; expiresAt: Date; deliveryStatus: "PENDING" }, transaction = prismaInvitations) {
    const result = await transaction.invitation.updateMany({
      where: {
        id: input.invitationId,
        version: input.expectedVersion,
        status: { in: ["PENDING", "SENT"] },
        tokenHash: { not: null },
        expiresAt: { gt: input.now },
      },
      data: {
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        deliveryStatus: input.deliveryStatus,
        version: { increment: 1 },
      },
    });
    return result.count === 1;
  }

  async replacePendingForEmail(input: { invitationId: string; expectedVersion: number; expectedTokenHash: string; tokenHash: string; expiresAt: Date }, transaction = prismaInvitations) {
    const result = await transaction.invitation.updateMany({
      where: {
        id: input.invitationId,
        version: input.expectedVersion,
        status: "PENDING",
        tokenHash: input.expectedTokenHash,
      },
      data: {
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        deliveryStatus: "PENDING",
        version: { increment: 1 },
      },
    });
    return result.count === 1;
  }

  async markConsumed(invitationId: string, transactionOverride?: any) {
    const client = transactionOverride ?? prismaInvitations;

    return client.invitation.update({
      where: { id: invitationId },
      data: {
        status: "CONSUMED",
        consumedAt: new Date(),
        tokenHash: null,
      },
    });
  }

  async revokeIfCurrent(input: VersionedInvitationCommand, transaction = prismaInvitations) {
    const result = await transaction.invitation.updateMany({
      where: {
        id: input.invitationId,
        version: input.expectedVersion,
        status: { in: ["PENDING", "SENT"] },
        tokenHash: { not: null },
        expiresAt: { gt: input.now },
      },
      data: {
        status: "REVOKED",
        tokenHash: null,
        version: { increment: 1 },
      },
    });
    return result.count === 1;
  }

  async markConsumedIfTokenMatches(input: { invitationId: string; tokenHash: string }, transactionOverride?: any) {
    const client = transactionOverride ?? prismaInvitations;

    const result = await client.invitation.updateMany({
      where: {
        id: input.invitationId,
        tokenHash: input.tokenHash,
      },
      data: {
        status: "CONSUMED",
        consumedAt: new Date(),
        tokenHash: null,
      },
    });

    return result.count > 0;
  }
}

export const invitationRepository = new InvitationRepository();
