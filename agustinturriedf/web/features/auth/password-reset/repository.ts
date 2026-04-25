import { prisma } from "@/lib/prisma";

const prismaPasswordReset = prisma as any;

type UpsertResetTokenInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

type ConsumeTokenAndUpdatePasswordInput = {
  userId: string;
  passwordHash: string;
  passwordUpdatedAt: Date;
};

export class PasswordResetRepository {
  async findUserByEmail(email: string) {
    return prismaPasswordReset.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
      },
    }) as Promise<{ id: string; email: string } | null>;
  }

  async upsertResetToken(input: UpsertResetTokenInput) {
    return prismaPasswordReset.passwordResetToken.upsert({
      where: {
        userId: input.userId,
      },
      update: {
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
      create: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findValidTokenByHash(tokenHash: string) {
    return prismaPasswordReset.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
      select: {
        userId: true,
        expiresAt: true,
      },
    }) as Promise<{ userId: string; expiresAt: Date } | null>;
  }

  async consumeTokenAndUpdatePassword(input: ConsumeTokenAndUpdatePasswordInput) {
    const deletedRows = await prismaPasswordReset.$transaction(async (transaction: any) => {
      await transaction.user.update({
        where: {
          id: input.userId,
        },
        data: {
          passwordHash: input.passwordHash,
          passwordUpdatedAt: input.passwordUpdatedAt,
        },
      });

      const deleteResult = await transaction.passwordResetToken.deleteMany({
        where: {
          userId: input.userId,
        },
      });

      return deleteResult.count as number;
    });

    return deletedRows > 0;
  }
}

export const passwordResetRepository = new PasswordResetRepository();
