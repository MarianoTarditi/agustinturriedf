import { prisma } from "@/lib/prisma";

const prismaInvitations = prisma as any;

export type CreateInvitationRepositoryInput = {
  email: string;
  tokenHash: string;
  expiresAt: Date;
  trainerId: string;
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

export class InvitationRepository {
  async create(input: CreateInvitationRepositoryInput) {
    return prismaInvitations.invitation.create({ data: input });
  }

  async findByEmail(email: string) {
    return prismaInvitations.invitation.findUnique({ where: { email } });
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

  async updateToken(invitationId: string, input: { tokenHash: string; expiresAt: Date; status: "SENT" | "PENDING" }) {
    return prismaInvitations.invitation.update({
      where: { id: invitationId },
      data: {
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        status: input.status,
      },
    });
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

  async markRevoked(invitationId: string) {
    return prismaInvitations.invitation.update({
      where: { id: invitationId },
      data: {
        status: "REVOKED",
        tokenHash: null,
      },
    });
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
