import { prisma } from "@/lib/prisma";

import { auditRepository } from "@/features/audit/repository";
import { buildAuditEvent } from "@/features/audit/event-factory";
import { addDays, normalizeToBuenosAiresDay } from "@/features/payments/timezone";
import { ApiError } from "@/lib/http/api-response";

type Role = "ADMIN" | "TRAINER" | "STUDENT";
type StudentStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";
type ProfileGender = "MALE" | "FEMALE" | "NON_BINARY" | "OTHER";
type AccountStatus = "ACTIVE" | "INACTIVE" | "BLOCKED" | "ARCHIVED";
const DEFAULT_MONTHLY_AMOUNT_IN_CENTS = 3_000_000;

const userWithProfileInclude = {
  studentProfile: true,
} as const;

export type CreateUserRepositoryInput = {
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  passwordHash: string;
  phone?: string | null;
  photoUrl?: string | null;
  birthDate?: Date | null;
  gender?: ProfileGender | null;
  heightCm?: number | null;
  weightKg?: number | null;
  studentProfile?: {
    trainerId: string;
    status?: StudentStatus;
    initialPaymentStartDate?: Date | null;
  };
};

type StudentProfileUpdateAction =
  | {
      action: "upsert";
      trainerId: string;
      status?: StudentStatus;
    }
  | {
      action: "delete";
    };

export type UpdateUserRepositoryInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  passwordHash?: string;
  studentProfile?: StudentProfileUpdateAction;
};

export type UpdateSelfProfileRepositoryInput = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  photoUrl?: string | null;
  birthDate?: Date | null;
  gender?: ProfileGender | null;
  heightCm?: number | null;
  weightKg?: number | null;
};

export type LifecycleTransitionRepositoryInput = {
  userId: string;
  actorId: string;
  targetStatus: AccountStatus;
  expectedVersion: number;
  reason: string;
};

const removeUndefined = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));

const allowedTransitions: Record<AccountStatus, readonly AccountStatus[]> = {
  ACTIVE: ["INACTIVE", "BLOCKED", "ARCHIVED"],
  INACTIVE: ["ACTIVE", "BLOCKED", "ARCHIVED"],
  BLOCKED: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: ["INACTIVE"],
};

const isRetryableTransactionError = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "P2034";

export class UserRepository {
  async list() {
    return prisma.user.findMany({
      include: userWithProfileInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: userWithProfileInclude,
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: userWithProfileInclude,
    });
  }

  async getSelfProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: userWithProfileInclude,
    });
  }

  async create(input: CreateUserRepositoryInput, transactionOverride?: any) {
    const prismaUsers = prisma as any;

    const runCreate = async (transaction: any) => {
      const createdUser = await transaction.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          role: input.role,
          passwordHash: input.passwordHash,
          ...removeUndefined({
            phone: input.phone,
            photoUrl: input.photoUrl,
            birthDate: input.birthDate,
            gender: input.gender,
            heightCm: input.heightCm,
            weightKg: input.weightKg,
          }),
          ...(input.studentProfile
            ? {
                studentProfile: {
                  create: {
                    trainerId: input.studentProfile.trainerId,
                    status: input.studentProfile.status ?? "ACTIVE",
                  },
                },
              }
            : {}),
        },
        include: userWithProfileInclude,
      });

      if (createdUser.role === "STUDENT" && createdUser.studentProfile) {
        const trainerConfig = await transaction.trainerConfig.upsert({
          where: {
            trainerId: createdUser.studentProfile.trainerId,
          },
          update: {},
          create: {
            trainerId: createdUser.studentProfile.trainerId,
            defaultMonthlyAmountInCents: DEFAULT_MONTHLY_AMOUNT_IN_CENTS,
          },
        });

        const startDate = normalizeToBuenosAiresDay(
          input.studentProfile?.initialPaymentStartDate ?? createdUser.createdAt
        );

        await transaction.currentPayment.create({
          data: {
            studentProfileId: createdUser.studentProfile.id,
            amountInCents: trainerConfig.defaultMonthlyAmountInCents,
            startDate,
            dueDate: addDays(startDate, 30),
          },
        });
      }

      return createdUser;
    };

    if (transactionOverride) {
      return runCreate(transactionOverride);
    }

    return prismaUsers.$transaction(runCreate);
  }

  async update(userId: string, input: UpdateUserRepositoryInput) {
    const data = {
      ...removeUndefined({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        passwordHash: input.passwordHash,
      }),
    };

    if (input.studentProfile?.action === "upsert") {
      data.studentProfile = {
        upsert: {
          create: {
            trainerId: input.studentProfile.trainerId,
            status: input.studentProfile.status ?? "ACTIVE",
          },
          update: removeUndefined({
            trainerId: input.studentProfile.trainerId,
            status: input.studentProfile.status,
          }),
        },
      };
    }

    if (input.studentProfile?.action === "delete") {
      data.studentProfile = {
        delete: true,
      };
    }

    return prisma.user.update({
      where: { id: userId },
      data,
      include: userWithProfileInclude,
    });
  }

  async updateSelfProfile(userId: string, input: UpdateSelfProfileRepositoryInput) {
    return prisma.user.update({
      where: { id: userId },
      data: removeUndefined({
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        photoUrl: input.photoUrl,
        birthDate: input.birthDate,
        gender: input.gender,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
      }),
      include: userWithProfileInclude,
    });
  }

  async transition(input: LifecycleTransitionRepositoryInput) {
    const prismaUsers = prisma as any;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await prismaUsers.$transaction(
          async (transaction: any) => {
            const currentUser = await transaction.user.findUnique({
              where: { id: input.userId },
              include: userWithProfileInclude,
            });
            if (!currentUser) throw new ApiError("Usuario no encontrado", 404, "NOT_FOUND");
            const fromStatus = currentUser.status as AccountStatus;
            if (!allowedTransitions[fromStatus].includes(input.targetStatus)) {
              throw new ApiError("Invalid account lifecycle transition", 409, "INVALID_TRANSITION");
            }
            if (currentUser.role === "ADMIN" && input.targetStatus === "ARCHIVED" && input.actorId === currentUser.id) {
              throw new ApiError("Administrators cannot archive themselves", 403, "FORBIDDEN");
            }

            const removesActiveAdmin = currentUser.role === "ADMIN" && currentUser.status === "ACTIVE" && input.targetStatus !== "ACTIVE";
            if (removesActiveAdmin) {
              const activeAdminCount = await transaction.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
              if (activeAdminCount <= 1) {
                throw new ApiError("At least one active administrator must remain", 409, "LAST_ACTIVE_ADMIN");
              }
            }

            const archivalUpdate = input.targetStatus === "ARCHIVED"
              ? { archivedAt: new Date(), archivedByUserId: input.actorId, archiveReason: input.reason }
              : fromStatus === "ARCHIVED"
                ? { archivedAt: null, archivedByUserId: null, archiveReason: null }
                : {};
            const mutation = await transaction.user.updateMany({
              where: { id: input.userId, version: input.expectedVersion, status: currentUser.status },
              data: { status: input.targetStatus, version: { increment: 1 }, authVersion: { increment: 1 }, ...archivalUpdate },
            });
            if (mutation.count !== 1) throw new ApiError("Account version is stale", 409, "VERSION_CONFLICT");

            const updatedUser = await transaction.user.findUnique({
              where: { id: input.userId },
              include: userWithProfileInclude,
            });
            await auditRepository.append(
              buildAuditEvent({
                eventType: input.targetStatus === "ARCHIVED" ? "ACCOUNT_ARCHIVED" : fromStatus === "ARCHIVED" ? "ACCOUNT_RESTORED" : "ACCOUNT_LIFECYCLE_TRANSITION",
                subjectUserId: input.userId,
                actor: { type: "USER", userId: input.actorId },
                reason: input.reason,
                summary: { fromStatus, toStatus: input.targetStatus },
              }),
              transaction
            );
            return updatedUser;
          },
          { isolationLevel: "Serializable" }
        );
      } catch (error) {
        if (!isRetryableTransactionError(error) || attempt === 2) throw error;
      }
    }

    throw new ApiError("Lifecycle transition retry limit exceeded", 409, "VERSION_CONFLICT");
  }

  async delete(userId: string) {
    return prisma.user.delete({
      where: { id: userId },
      include: userWithProfileInclude,
    });
  }
}

export const userRepository = new UserRepository();
