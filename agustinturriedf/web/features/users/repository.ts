import { prisma } from "@/lib/prisma";

import { addDays, normalizeToBuenosAiresDay } from "@/features/payments/timezone";

type Role = "ADMIN" | "TRAINER" | "STUDENT";
type StudentStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";
type ProfileGender = "MALE" | "FEMALE" | "NON_BINARY" | "OTHER";
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
  role?: Role;
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

const removeUndefined = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));

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

  async create(input: CreateUserRepositoryInput) {
    const prismaUsers = prisma as any;

    return prismaUsers.$transaction(async (transaction: any) => {
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
    });
  }

  async update(userId: string, input: UpdateUserRepositoryInput) {
    const data = {
      ...removeUndefined({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        role: input.role,
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

  async delete(userId: string) {
    return prisma.user.delete({
      where: { id: userId },
      include: userWithProfileInclude,
    });
  }
}

export const userRepository = new UserRepository();
