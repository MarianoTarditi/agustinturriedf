import { createHash, randomBytes } from "node:crypto";

import { hash } from "bcryptjs";

import { type AuthenticatedUser, requireRole } from "@/features/auth/authorization";
import { sendActivationEmail } from "@/features/invitations/email";
import { invitationLogger } from "@/features/invitations/logger";
import { invitationRepository } from "@/features/invitations/repository";
import { routinesRepository } from "@/features/routines/repository";
import { ensureStudentRoutineDirectory } from "@/features/routines/storage";
import { userRepository } from "@/features/users/repository";
import { ApiError } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import {
  activateInvitationSchema,
  createInvitationSchema,
  type CreateInvitationInput,
} from "@/lib/validation/invitations";

const TOKEN_EXPIRATION_HOURS = 48;
const PASSWORD_HASH_ROUNDS = 12;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const generateToken = () => randomBytes(32).toString("hex");
const addHours = (value: Date, hours: number) => new Date(value.getTime() + hours * 60 * 60 * 1000);
const normalizeEmail = (value: string) => value.trim().toLowerCase();

const normalizeIsoDateToUtcMidnight = (dateValue: string) => {
  const [yearRaw, monthRaw, dayRaw] = dateValue.split("-");
  return new Date(Date.UTC(Number(yearRaw), Number(monthRaw) - 1, Number(dayRaw)));
};

const activationBaseUrl = () => process.env.NEXTAUTH_URL?.trim() || "http://localhost:3010";
const buildActivationUrl = (token: string) => `${activationBaseUrl()}/activation?token=${encodeURIComponent(token)}`;

const ensureTrainerCanManage = (actor: AuthenticatedUser, trainerId: string) => {
  if (actor.role === "ADMIN") return;
  if (actor.role === "TRAINER" && actor.id === trainerId) return;
  throw new ApiError("No tenés permisos para gestionar esta invitación", 403, "FORBIDDEN");
};

const isExpired = (expiresAt: Date | null, now: Date) => !expiresAt || expiresAt.getTime() <= now.getTime();

export class InvitationService {
  async create(actor: AuthenticatedUser, input: CreateInvitationInput) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden crear invitaciones");

    const parsedInput = createInvitationSchema.parse(input);
    ensureTrainerCanManage(actor, parsedInput.trainerId);

    const trainer = await userRepository.findById(parsedInput.trainerId);
    if (!trainer || trainer.role !== "TRAINER") {
      throw new ApiError("trainerId debe pertenecer a un usuario TRAINER", 400, "VALIDATION_ERROR");
    }

    const email = normalizeEmail(parsedInput.email);
    const existingInvitation = await invitationRepository.findByEmail(email);

    if (existingInvitation && (existingInvitation.status === "PENDING" || existingInvitation.status === "SENT")) {
      throw new ApiError("Ya existe una invitación activa para este email", 409, "CONFLICT");
    }

    const rawToken = generateToken();
    const expiresAt = addHours(new Date(), TOKEN_EXPIRATION_HOURS);

    const createdInvitation = await invitationRepository.create({
      firstName: parsedInput.firstName,
      lastName: parsedInput.lastName,
      email,
      phone: parsedInput.phone,
      birthDate:
        parsedInput.birthDate === undefined
          ? undefined
          : parsedInput.birthDate === null
            ? null
            : normalizeIsoDateToUtcMidnight(parsedInput.birthDate),
      gender: parsedInput.gender,
      heightCm: parsedInput.heightCm,
      weightKg: parsedInput.weightKg,
      trainerId: parsedInput.trainerId,
      tokenHash: hashToken(rawToken),
      expiresAt,
      status: "SENT",
      initialPaymentStartDate:
        parsedInput.initialPaymentStartDate === undefined
          ? undefined
          : parsedInput.initialPaymentStartDate === null
            ? null
            : normalizeIsoDateToUtcMidnight(parsedInput.initialPaymentStartDate),
    });

    await sendActivationEmail({
      to: email,
      activationUrl: buildActivationUrl(rawToken),
      expiresAt,
    });

    await invitationLogger.created({
      invitationId: createdInvitation.id,
      email: createdInvitation.email,
      trainerId: createdInvitation.trainerId,
    });

    return createdInvitation;
  }

  async resend(invitationId: string, actor: AuthenticatedUser) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden reenviar invitaciones");

    const invitation = await invitationRepository.findById(invitationId);
    if (!invitation) throw new ApiError("Invitación no encontrada", 404, "NOT_FOUND");
    ensureTrainerCanManage(actor, invitation.trainerId);

    const rawToken = generateToken();
    const expiresAt = addHours(new Date(), TOKEN_EXPIRATION_HOURS);
    const updated = await invitationRepository.updateToken(invitationId, {
      tokenHash: hashToken(rawToken),
      expiresAt,
      status: "SENT",
    });

    await sendActivationEmail({
      to: updated.email,
      activationUrl: buildActivationUrl(rawToken),
      expiresAt,
    });

    await invitationLogger.resent({
      invitationId: updated.id,
      email: updated.email,
      trainerId: updated.trainerId,
    });

    return updated;
  }

  async activate(input: unknown) {
    // SECURITY BOUNDARY: activation is token-gated and intentionally unauthenticated.
    // We never trust client payload without Zod validation and token-hash lookup.
    const parsedInput = activateInvitationSchema.parse(input);
    const tokenHash = hashToken(parsedInput.token);
    const invitation = await invitationRepository.findByTokenHash(tokenHash);
    if (!invitation) throw new ApiError("Token inválido o expirado", 400, "INVALID_OR_EXPIRED_TOKEN");

    const now = new Date();
    if (isExpired(invitation.expiresAt, now)) {
      await invitationLogger.expired({
        invitationId: invitation.id,
        email: invitation.email,
        trainerId: invitation.trainerId,
      });
      throw new ApiError("Token inválido o expirado", 400, "INVALID_OR_EXPIRED_TOKEN");
    }

    const passwordHash = await hash(parsedInput.password, PASSWORD_HASH_ROUNDS);
    // SECURITY BOUNDARY: all DB mutations that must succeed/fail together stay inside
    // a single interactive transaction to avoid partially activated accounts.
    const createdUser = await prisma.$transaction(async (transaction) => {
      const user = await userRepository.create(
        {
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          email: invitation.email,
          role: "STUDENT",
          passwordHash,
          phone: invitation.phone,
          birthDate: invitation.birthDate,
          gender: invitation.gender,
          heightCm: invitation.heightCm,
          weightKg: invitation.weightKg,
          studentProfile: {
            trainerId: invitation.trainerId,
            status: "ACTIVE",
            initialPaymentStartDate: invitation.initialPaymentStartDate,
          },
        },
        transaction
      );

      await routinesRepository.ensureFolderForStudent(
        {
          studentProfileId: user.studentProfile!.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        transaction
      );

      const consumed = await invitationRepository.markConsumedIfTokenMatches(
        {
          invitationId: invitation.id,
          tokenHash,
        },
        transaction
      );

      if (!consumed) {
        // Single-use guard: if token was already consumed/replaced concurrently,
        // abort the whole activation transaction.
        throw new ApiError("Token inválido o expirado", 400, "INVALID_OR_EXPIRED_TOKEN");
      }

      return user;
    });

    await ensureStudentRoutineDirectory(createdUser.studentProfile!.id);

    await invitationLogger.consumed({
      invitationId: invitation.id,
      email: invitation.email,
      trainerId: invitation.trainerId,
    });

    return { message: "Cuenta activada. Ya podés iniciar sesión." };
  }

  async revoke(invitationId: string, actor: AuthenticatedUser) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden revocar invitaciones");

    const invitation = await invitationRepository.findById(invitationId);
    if (!invitation) throw new ApiError("Invitación no encontrada", 404, "NOT_FOUND");
    ensureTrainerCanManage(actor, invitation.trainerId);

    await invitationRepository.markRevoked(invitation.id);
    await invitationLogger.revoked({
      invitationId: invitation.id,
      email: invitation.email,
      trainerId: invitation.trainerId,
    });

    return { message: "Invitación revocada." };
  }

  async findByIdForActor(invitationId: string, actor: AuthenticatedUser) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden ver invitaciones");

    const invitation = await invitationRepository.findById(invitationId);
    if (!invitation) {
      throw new ApiError("Invitación no encontrada", 404, "NOT_FOUND");
    }

    ensureTrainerCanManage(actor, invitation.trainerId);
    return invitation;
  }

  async listForActor(actor: AuthenticatedUser) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden listar invitaciones");
    return actor.role === "ADMIN" ? invitationRepository.listAll() : invitationRepository.listByTrainer(actor.id);
  }
}

export const invitationService = new InvitationService();
