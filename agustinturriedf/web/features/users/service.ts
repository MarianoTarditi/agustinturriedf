import { hash } from "bcryptjs";

import {
  requireRole,
  type AuthenticatedUser,
} from "@/features/auth/authorization";
import { type UserDTO } from "@/features/users/dto";
import {
  requireUserDirectoryAccess,
  requireUserMutationAccess,
  requireUserReadAccess,
} from "@/features/users/policy";
import {
  routinesRepository,
} from "@/features/routines/repository";
import {
  ensureStudentRoutineDirectory,
  removeStudentRoutineDirectory,
} from "@/features/routines/storage";
import {
  type CreateUserRepositoryInput,
  type DirectoryRepositoryQuery,
  type LifecycleTransitionRepositoryInput,
  type UpdateSelfProfileRepositoryInput,
  userRepository,
  type UpdateUserRepositoryInput,
} from "@/features/users/repository";
import { ApiError } from "@/lib/http/api-response";
import {
  createUserSchema,
  type CreateUserInput,
  type SelfProfileDTO,
  stripImmutableSelfProfileFields,
  type UpdateUserInput,
  type UserDirectoryQuery,
  type UpdateSelfProfileInput,
  updateSelfProfileSchema,
  updateUserSchema,
} from "@/lib/validation/users";

const DEFAULT_BOOTSTRAP_PASSWORD = "123456789";

export type { UserDTO } from "@/features/users/dto";

type SelfProfileRecord = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  birthDate: Date | null;
  gender: "MALE" | "FEMALE" | "NON_BINARY" | "OTHER" | null;
  heightCm: number | null;
  weightKg: number | null;
};

const mapToUserDTO = (user: Awaited<ReturnType<typeof userRepository.create>>): UserDTO => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  photoUrl: user.photoUrl,
  birthDate: user.birthDate,
  gender: user.gender,
  heightCm: user.heightCm,
  weightKg: user.weightKg,
  role: user.role,
  status: user.status,
  version: user.version,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  studentProfile: user.studentProfile
    ? {
        id: user.studentProfile.id,
        trainerId: user.studentProfile.trainerId,
        status: user.studentProfile.status,
      }
    : null,
});

const mapToSelfProfileDTO = (user: SelfProfileRecord): SelfProfileDTO => ({
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  photoUrl: user.photoUrl,
  birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : null,
  gender: user.gender,
  heightCm: user.heightCm,
  weightKg: user.weightKg,
});

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const normalizeBirthDateToUtcMidnight = (dateValue: string) => {
  const [yearRaw, monthRaw, dayRaw] = dateValue.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  return new Date(Date.UTC(year, month - 1, day));
};

const normalizeIsoDateToUtcMidnight = (dateValue: string) => {
  const [yearRaw, monthRaw, dayRaw] = dateValue.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  return new Date(Date.UTC(year, month - 1, day));
};

const mapUpdateSelfProfileInputToRepository = (
  input: UpdateSelfProfileInput
): UpdateSelfProfileRepositoryInput => ({
  firstName: input.firstName,
  lastName: input.lastName,
  phone: input.phone,
  photoUrl: input.photoUrl,
  birthDate:
    input.birthDate === undefined
      ? undefined
      : input.birthDate === null
        ? null
        : normalizeBirthDateToUtcMidnight(input.birthDate),
  gender: input.gender,
  heightCm: input.heightCm,
  weightKg: input.weightKg,
});

const ensureTrainerExists = async (trainerId: string) => {
  const trainer = await userRepository.findById(trainerId);

  if (!trainer || trainer.role !== "TRAINER") {
    throw new ApiError("trainerId debe pertenecer a un usuario TRAINER", 400, "VALIDATION_ERROR");
  }
};

export class UserService {
  async backfillMissingRoutineFolders() {
    const createdFolders = await routinesRepository.backfillMissingRoutineFolders();

    await Promise.all(
      createdFolders.map((folder: { studentProfileId: string }) =>
        ensureStudentRoutineDirectory(folder.studentProfileId)
      )
    );

    return {
      createdCount: createdFolders.length,
    };
  }

  async getOwnProfile(actorId: string) {
    const ownProfile = (await userRepository.getSelfProfile(actorId)) as unknown as
      | SelfProfileRecord
      | null;

    if (!ownProfile) {
      throw new ApiError("Usuario no encontrado", 404, "NOT_FOUND");
    }

    return mapToSelfProfileDTO(ownProfile);
  }

  async updateOwnProfile(actorId: string, input: Record<string, unknown>) {
    const sanitizedInput = stripImmutableSelfProfileFields(input);
    const parsedInput = updateSelfProfileSchema.parse(sanitizedInput);

    const currentUser = (await userRepository.getSelfProfile(actorId)) as unknown as
      | SelfProfileRecord
      | null;

    if (!currentUser) {
      throw new ApiError("Usuario no encontrado", 404, "NOT_FOUND");
    }

    const repositoryInput = mapUpdateSelfProfileInputToRepository(parsedInput);
    const updatedProfile = (await userRepository.updateSelfProfile(
      actorId,
      repositoryInput
    )) as unknown as SelfProfileRecord;

    return mapToSelfProfileDTO(updatedProfile);
  }

  async listUsers(actor: AuthenticatedUser) {
    requireUserDirectoryAccess(actor);

    const users = await userRepository.list();
    return users
      .filter((user) => actor.role === "ADMIN" || user.role === "STUDENT")
      .map(mapToUserDTO);
  }

  async listDirectory(actor: AuthenticatedUser, query: UserDirectoryQuery) {
    requireUserDirectoryAccess(actor);

    if (actor.role === "TRAINER" && query.view === "team") {
      throw new ApiError("No tenés permisos para ver cuentas de equipo", 403, "FORBIDDEN");
    }

    const roles: DirectoryRepositoryQuery["roles"] =
      query.view === "students" ? ["STUDENT"] : query.role ? [query.role] : ["ADMIN", "TRAINER"];
    const page = await userRepository.listDirectory({ ...query, roles });

    return {
      items: page.items.map(mapToUserDTO),
      nextCursor: page.nextCursor,
    };
  }

  async getUserById(actor: AuthenticatedUser, userId: string) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new ApiError("Usuario no encontrado", 404, "NOT_FOUND");
    }

    requireUserReadAccess(actor, user);

    return mapToUserDTO(user);
  }

  async createUser(actor: AuthenticatedUser, input: CreateUserInput) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden crear usuarios");

    const parsedInput = createUserSchema.parse(input);
    const normalizedEmail = normalizeEmail(parsedInput.email);
    const existingUser = await userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new ApiError("Ya existe un usuario con ese email", 409, "CONFLICT");
    }

    const repositoryInput: CreateUserRepositoryInput = {
      firstName: parsedInput.firstName,
      lastName: parsedInput.lastName,
      email: normalizedEmail,
      role: parsedInput.role,
      passwordHash: await hash(DEFAULT_BOOTSTRAP_PASSWORD, 12),
      phone: parsedInput.phone,
      photoUrl: parsedInput.photoUrl,
      birthDate:
        parsedInput.birthDate === undefined
          ? undefined
          : parsedInput.birthDate === null
            ? null
            : normalizeBirthDateToUtcMidnight(parsedInput.birthDate),
      gender: parsedInput.gender,
      heightCm: parsedInput.heightCm,
      weightKg: parsedInput.weightKg,
    };

    if (parsedInput.role === "STUDENT") {
      const trainerId = parsedInput.trainerId;

      if (!trainerId) {
        throw new ApiError("trainerId es obligatorio para usuarios STUDENT", 400, "VALIDATION_ERROR");
      }

      await ensureTrainerExists(trainerId);

      repositoryInput.studentProfile = {
        trainerId,
        status: parsedInput.studentStatus ?? "ACTIVE",
        initialPaymentStartDate:
          parsedInput.initialPaymentStartDate === undefined
            ? undefined
            : parsedInput.initialPaymentStartDate === null
              ? null
              : normalizeIsoDateToUtcMidnight(parsedInput.initialPaymentStartDate),
      };
    }

    const createdUser = await userRepository.create(repositoryInput);

    if (createdUser.role === "STUDENT" && createdUser.studentProfile) {
      await routinesRepository.ensureFolderForStudent({
        studentProfileId: createdUser.studentProfile.id,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        email: createdUser.email,
      });

      await ensureStudentRoutineDirectory(createdUser.studentProfile.id);
    }

    return mapToUserDTO(createdUser);
  }

  async updateUser(actor: AuthenticatedUser, userId: string, input: UpdateUserInput) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden actualizar usuarios");

    const currentUser = await userRepository.findById(userId);

    if (!currentUser) {
      throw new ApiError("Usuario no encontrado", 404, "NOT_FOUND");
    }

    requireUserMutationAccess(actor, currentUser);

    const parsedInput = updateUserSchema.parse(input);
    const repositoryInput: UpdateUserRepositoryInput = {
      firstName: parsedInput.firstName,
      lastName: parsedInput.lastName,
      email: parsedInput.email ? normalizeEmail(parsedInput.email) : undefined,
      expectedVersion: parsedInput.expectedVersion,
      actorId: actor.id,
    };

    if (repositoryInput.email) {
      const existingWithEmail = await userRepository.findByEmail(repositoryInput.email);

      if (existingWithEmail && existingWithEmail.id !== currentUser.id) {
        throw new ApiError("Ya existe un usuario con ese email", 409, "CONFLICT");
      }
    }

    const updatedUser = await userRepository.update(userId, repositoryInput);
    return mapToUserDTO(updatedUser);
  }

  async transitionUser(
    actor: AuthenticatedUser,
    userId: string,
    input: Omit<LifecycleTransitionRepositoryInput, "userId" | "actorId">
  ) {
    const currentUser = await userRepository.findById(userId);

    if (!currentUser) {
      throw new ApiError("Usuario no encontrado", 404, "NOT_FOUND");
    }

    requireUserMutationAccess(actor, currentUser);

    const updatedUser = await userRepository.transition({
      ...input,
      userId,
      actorId: actor.id,
    });

    return mapToUserDTO(updatedUser);
  }

  async deleteUser(actor: AuthenticatedUser, userId: string) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden eliminar usuarios");

    const existingUser = await userRepository.findById(userId);

    if (!existingUser) {
      throw new ApiError("Usuario no encontrado", 404, "NOT_FOUND");
    }

    const studentProfileId = existingUser.role === "STUDENT" ? existingUser.studentProfile?.id : undefined;

    const deletedUser = await userRepository.delete(userId);

    if (deletedUser.role === "STUDENT" && studentProfileId) {
      await removeStudentRoutineDirectory(studentProfileId);
    }

    return mapToUserDTO(deletedUser);
  }
}

export const userService = new UserService();
export { DEFAULT_BOOTSTRAP_PASSWORD };
