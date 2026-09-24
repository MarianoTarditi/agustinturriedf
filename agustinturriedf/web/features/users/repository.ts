import { prisma } from "@/lib/prisma";

import { auditRepository } from "@/features/audit/repository";
import { buildAuditEvent } from "@/features/audit/event-factory";
import { addDays, normalizeToBuenosAiresDay } from "@/features/payments/timezone";
import { createHmac, timingSafeEqual } from "node:crypto";

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
    trainerId?: string | null;
    status?: StudentStatus;
    initialPaymentStartDate?: Date | null;
  };
};

export type UpdateUserRepositoryInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  expectedVersion: number;
  actorId: string;
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

export type DirectoryRepositoryQuery = {
  view: "students" | "team";
  roles: Role[];
  search?: string;
  status?: AccountStatus;
  trainerId?: string;
  role?: Extract<Role, "ADMIN" | "TRAINER">;
  sort: "createdAt:asc" | "createdAt:desc";
  limit: number;
  cursor?: string;
};

type DirectoryCursor = {
  scope: string;
  sort: DirectoryRepositoryQuery["sort"];
  createdAt: string;
  id: string;
};

const directoryCursorSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new ApiError("Directory cursor signing is not configured", 500, "CONFIGURATION_ERROR");
  return secret;
};

const directoryScope = (query: DirectoryRepositoryQuery) =>
  JSON.stringify({ view: query.view, roles: query.roles, search: query.search ?? null, status: query.status ?? null, trainerId: query.trainerId ?? null, role: query.role ?? null });

const signDirectoryCursor = (payload: string) => createHmac("sha256", directoryCursorSecret()).update(payload).digest("base64url");

const parseDirectoryCursor = (value: string | undefined, query: DirectoryRepositoryQuery): DirectoryCursor | undefined => {
  if (!value) return undefined;
  try {
    const parts = value.split(".");
    if (parts.length !== 2 || parts.some((part) => !part)) throw new Error("Invalid cursor");
    const [payload, signature] = parts;
    const expectedSignature = signDirectoryCursor(payload);
    if (signature.length !== expectedSignature.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) throw new Error("Invalid cursor");
    const cursor = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DirectoryCursor;
    if (!cursor.id || cursor.scope !== directoryScope(query) || cursor.sort !== query.sort || Number.isNaN(new Date(cursor.createdAt).getTime())) throw new Error("Invalid cursor");
    return cursor;
  } catch {
    throw new ApiError("Invalid directory cursor", 400, "VALIDATION_ERROR");
  }
};

const createDirectoryCursor = (user: { id: string; createdAt: Date }, query: DirectoryRepositoryQuery) => {
  const payload = Buffer.from(JSON.stringify({ scope: directoryScope(query), sort: query.sort, createdAt: user.createdAt.toISOString(), id: user.id })).toString("base64url");
  return `${payload}.${signDirectoryCursor(payload)}`;
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
  async listDirectory(query: DirectoryRepositoryQuery) {
    const cursor = parseDirectoryCursor(query.cursor, query);
    const direction = query.sort.endsWith(":asc") ? "asc" : "desc";
    const users = await (prisma as any).user.findMany({
      where: {
        role: { in: query.roles },
        ...(query.status ? { status: query.status } : { status: { not: "ARCHIVED" } }),
        ...(query.trainerId ? { studentProfile: { is: { trainerId: query.trainerId } } } : {}),
        AND: [
          ...(query.search
            ? [{ OR: [
                { firstName: { contains: query.search, mode: "insensitive" } },
                { lastName: { contains: query.search, mode: "insensitive" } },
                { email: { contains: query.search, mode: "insensitive" } },
              ] }]
            : []),
        ...(cursor
          ? [{ OR:
                direction === "asc"
                  ? [{ createdAt: { gt: new Date(cursor.createdAt) } }, { createdAt: new Date(cursor.createdAt), id: { gt: cursor.id } }]
                  : [{ createdAt: { lt: new Date(cursor.createdAt) } }, { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } }],
              }]
          : []),
        ],
      },
      include: userWithProfileInclude,
      orderBy: [{ createdAt: direction }, { id: direction }],
      take: query.limit + 1,
    });
    const hasMore = users.length > query.limit;
    const items = users.slice(0, query.limit);
    const last = items.at(-1);

    return {
      items,
      nextCursor: hasMore && last ? createDirectoryCursor(last, query) : null,
    };
  }

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
                    ...removeUndefined({ trainerId: input.studentProfile.trainerId ?? undefined }),
                    status: input.studentProfile.status ?? "ACTIVE",
                  },
                },
              }
            : {}),
        },
        include: userWithProfileInclude,
      });

      if (createdUser.role === "STUDENT" && createdUser.studentProfile && input.studentProfile?.trainerId) {
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
    return (prisma as any).$transaction(async (transaction: any) => {
      const currentUser = await transaction.user.findUnique({ where: { id: userId }, include: userWithProfileInclude });
      if (!currentUser) throw new ApiError("Usuario no encontrado", 404, "NOT_FOUND");

      const mutation = await transaction.user.updateMany({
        where: { id: userId, version: input.expectedVersion },
        data: { ...removeUndefined({ firstName: input.firstName, lastName: input.lastName, email: input.email }), version: { increment: 1 } },
      });
      if (mutation.count !== 1) throw new ApiError("Account version is stale", 409, "VERSION_CONFLICT");

      await auditRepository.append(buildAuditEvent({
        eventType: "USER_PROFILE_UPDATED",
        subjectUserId: userId,
        actor: { type: "USER", userId: input.actorId },
        summary: { changedFields: Object.keys(removeUndefined({ firstName: input.firstName, lastName: input.lastName, email: input.email })) },
      }), transaction);

      return transaction.user.findUnique({ where: { id: userId }, include: userWithProfileInclude });
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
