import { createHash, randomBytes } from "node:crypto";

import { hash } from "bcryptjs";

import { type AuthenticatedUser, requireRole } from "@/features/auth/authorization";
import { buildAuditEvent } from "@/features/audit/event-factory";
import { auditRepository } from "@/features/audit/repository";
import { invitationLogger } from "@/features/invitations/logger";
import { invitationRepository } from "@/features/invitations/repository";
import { routinesRepository } from "@/features/routines/repository";
import { ensureStudentRoutineDirectory } from "@/features/routines/storage";
import { userRepository } from "@/features/users/repository";
import { encryptPayload } from "@/features/outbox/crypto";
import { outboxRepository } from "@/features/outbox/repository";
import { paymentsRepository } from "@/features/payments/repository";
import { parseBuenosAiresDateInput } from "@/features/payments/timezone";
import { ApiError } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import {
  activateInvitationSchema,
  createInvitationSchema,
  resendInvitationSchema,
  revokeInvitationSchema,
  type CreateInvitationInput,
  type InvitationQueueQuery,
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
const normalizeOptionalDate = (dateValue: string | Date | null | undefined) =>
  typeof dateValue === "string" ? normalizeIsoDateToUtcMidnight(dateValue) : dateValue;

const activationBaseUrl = () => process.env.NEXTAUTH_URL?.trim() || "http://localhost:3010";
const buildActivationUrl = (token: string) => `${activationBaseUrl()}/activation/exchange?token=${encodeURIComponent(token)}`;
const outboxKey = () => {
  const value = process.env.OUTBOX_ENCRYPTION_KEY?.trim();
  const id = process.env.OUTBOX_ENCRYPTION_KEY_ID?.trim() || "current";
  if (!value) throw new ApiError("Outbox encryption is not configured", 500, "OUTBOX_CONFIG_MISSING");
  return { id, value };
};

const ensureActorCanManage = (actor: AuthenticatedUser, invitation: { role: string; trainerId: string | null }) => {
  if (actor.role === "ADMIN") return;
  if (actor.role === "TRAINER" && invitation.role === "STUDENT" && actor.id === invitation.trainerId) return;
  throw new ApiError("Forbidden", 403, "FORBIDDEN");
};

const isExpired = (expiresAt: Date | null, now: Date) => !expiresAt || expiresAt.getTime() <= now.getTime();
const requireEligibleInvitation = (invitation: any, now: Date) => {
  if (!invitation || !["PENDING", "SENT"].includes(invitation.status) || isExpired(invitation.expiresAt, now)) {
    throw new ApiError("Invitation cannot be changed", 409, "CONFLICT");
  }
};

const requireResendableInvitation = (invitation: any) => {
  if (!invitation || !["PENDING", "SENT", "EXPIRED"].includes(invitation.status)) {
    throw new ApiError("Invitation cannot be changed", 409, "CONFLICT");
  }
};

export class InvitationService {
  async create(actor: AuthenticatedUser, input: Omit<CreateInvitationInput, "role"> & { role?: CreateInvitationInput["role"] }) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden crear invitaciones");

    const parsedInput = createInvitationSchema.parse(input);
    if (actor.role === "TRAINER" && (parsedInput.role !== "STUDENT" || parsedInput.trainerId !== actor.id)) {
      throw new ApiError("Trainers may issue only their own STUDENT invitations", 403, "FORBIDDEN");
    }

    if (parsedInput.role === "STUDENT") {
      const trainer = await userRepository.findById(parsedInput.trainerId!);
      if (!trainer || trainer.role !== "TRAINER" || trainer.status !== "ACTIVE") {
        throw new ApiError("trainerId must belong to an active TRAINER", 400, "VALIDATION_ERROR");
      }
    }

    const email = normalizeEmail(parsedInput.email);

    const createdInvitation = await prisma.$transaction(async (transaction) => {
      await invitationRepository.lockIssuanceForEmail(email, transaction);
      const now = new Date();
      if (await userRepository.findByEmail(email, transaction)) throw new ApiError("Email is reserved", 409, "CONFLICT");
      if (await invitationRepository.findActiveByEmail(email, now, transaction)) {
        throw new ApiError("Invitation already exists", 409, "CONFLICT");
      }

      const rawToken = generateToken();
      const expiresAt = addHours(now, TOKEN_EXPIRATION_HOURS);
      const invitation = await invitationRepository.create({
        firstName: parsedInput.firstName, lastName: parsedInput.lastName, email, role: parsedInput.role,
        phone: parsedInput.phone, birthDate: normalizeOptionalDate(parsedInput.birthDate),
        gender: parsedInput.gender, heightCm: parsedInput.heightCm, weightKg: parsedInput.weightKg,
        trainerId: parsedInput.role === "STUDENT" ? parsedInput.trainerId : null, tokenHash: hashToken(rawToken), expiresAt, status: "PENDING",
        initialPaymentStartDate: parsedInput.initialPaymentStartDate
          ? parseBuenosAiresDateInput(parsedInput.initialPaymentStartDate)
          : undefined,
      }, transaction);
      await auditRepository.append(buildAuditEvent({ eventType: "INVITATION_ISSUED", invitationId: invitation.id, actor: { type: "USER", userId: actor.id }, summary: { changedFields: ["role"], deliveryStatus: "PENDING" } }), transaction as any);
      await outboxRepository.enqueue({ messageType: "EMAIL", resourceType: "INVITATION", resourceId: invitation.id, idempotencyKey: `invitation:${invitation.id}:issue`, payloadEncrypted: encryptPayload({ to: email, activationUrl: buildActivationUrl(rawToken), expiresAt: expiresAt.toISOString() }, outboxKey()) }, transaction as any);
      return invitation;
    });

    return this.toSafeDTO(createdInvitation);
  }

  async resend(invitationId: string, actor: AuthenticatedUser, expectedVersion: number) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden reenviar invitaciones");
    const command = { invitationId, expectedVersion: resendInvitationSchema.shape.expectedVersion.parse(expectedVersion) };

    const invitation = await invitationRepository.findById(invitationId);
    if (!invitation) throw new ApiError("Invitation not found", 404, "NOT_FOUND");
    ensureActorCanManage(actor, invitation);
    const now = new Date();
    requireResendableInvitation(invitation);

    const rawToken = generateToken();
    const expiresAt = addHours(now, TOKEN_EXPIRATION_HOURS);
    const tokenHash = hashToken(rawToken);
    await prisma.$transaction(async (transaction) => {
      const updated = await invitationRepository.resendIfCurrent({
        invitationId: command.invitationId, expectedVersion: command.expectedVersion, now, tokenHash, expiresAt, deliveryStatus: "PENDING",
      }, transaction);
      if (!updated) throw new ApiError("Invitation cannot be changed", 409, "CONFLICT");
      await auditRepository.append(buildAuditEvent({ eventType: "INVITATION_RESENT", invitationId: invitation.id, actor: { type: "USER", userId: actor.id }, summary: { deliveryStatus: "PENDING" } }), transaction as any);
      await outboxRepository.enqueue({ messageType: "EMAIL", resourceType: "INVITATION", resourceId: invitation.id, idempotencyKey: `invitation:${invitation.id}:resend:${invitation.version + 1}`, payloadEncrypted: encryptPayload({ to: invitation.email, activationUrl: buildActivationUrl(rawToken), expiresAt: expiresAt.toISOString() }, outboxKey()) }, transaction as any);
    });
    return this.toSafeDTO({ ...invitation, status: "PENDING", expiresAt, deliveryStatus: "PENDING", version: invitation.version + 1 });
  }

  async requestReplacement(rawEmail: string) {
    const email = normalizeEmail(rawEmail);
    const invitation = await invitationRepository.findPendingReplacementByEmail(email);
    const now = new Date();

    if (!invitation) return;

    const rawToken = generateToken();
    const expiresAt = addHours(now, TOKEN_EXPIRATION_HOURS);
    const tokenHash = hashToken(rawToken);

    await prisma.$transaction(async (transaction) => {
      const replaced = await invitationRepository.replacePendingForEmail({
        invitationId: invitation.id,
        expectedVersion: invitation.version,
        expectedTokenHash: invitation.tokenHash,
        tokenHash,
        expiresAt,
      }, transaction);
      if (!replaced) return;

      await auditRepository.append(buildAuditEvent({
        eventType: "INVITATION_REPLACEMENT_REQUESTED",
        invitationId: invitation.id,
        actor: { type: "SYSTEM" },
        summary: { deliveryStatus: "PENDING" },
      }), transaction as any);
      await outboxRepository.enqueue({
        messageType: "EMAIL",
        resourceType: "INVITATION",
        resourceId: invitation.id,
        idempotencyKey: `invitation:${invitation.id}:replacement:${invitation.version + 1}`,
        payloadEncrypted: encryptPayload({ to: invitation.email, activationUrl: buildActivationUrl(rawToken), expiresAt: expiresAt.toISOString() }, outboxKey()),
      }, transaction as any);
    });
  }

  async activate(input: unknown) {
    // SECURITY BOUNDARY: activation is token-gated and intentionally unauthenticated.
    // We never trust client payload without Zod validation and token-hash lookup.
    const parsedInput = activateInvitationSchema.parse(input);
    const tokenHash = hashToken(parsedInput.token);
    const invitation = await invitationRepository.findByTokenHash(tokenHash);
    if (!invitation) throw new ApiError("Token inválido o expirado", 400, "INVALID_OR_EXPIRED_TOKEN");

    const now = new Date();
    if (!invitation.trainerId) throw new ApiError("Token inválido o expirado", 400, "INVALID_OR_EXPIRED_TOKEN");
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

      const payment = await paymentsRepository.initializeCurrentPaymentForStudent({
        studentProfileId: user.studentProfile!.id,
        startDate: invitation.initialPaymentStartDate ?? now,
        transaction,
      });
      await auditRepository.append(buildAuditEvent({
        eventType: "STUDENT_DEBT_INITIALIZED",
        subjectUserId: user.id,
        actor: { type: "SUBJECT", userId: user.id },
        summary: { changedFields: ["outstandingAmountInCents"], resourceType: "CurrentPayment", resourceRef: payment.id },
      }), transaction as any);

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

  async revoke(invitationId: string, actor: AuthenticatedUser, input: { expectedVersion: number; reason: string }) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden revocar invitaciones");
    const command = { invitationId, ...revokeInvitationSchema.omit({ invitationId: true }).parse(input) };

    const invitation = await invitationRepository.findById(invitationId);
    if (!invitation) throw new ApiError("Invitation not found", 404, "NOT_FOUND");
    ensureActorCanManage(actor, invitation);
    const now = new Date();
    requireEligibleInvitation(invitation, now);
    await prisma.$transaction(async (transaction) => {
      const revoked = await invitationRepository.revokeIfCurrent({ invitationId: command.invitationId, expectedVersion: command.expectedVersion, now }, transaction);
      if (!revoked) throw new ApiError("Invitation cannot be changed", 409, "CONFLICT");
      await auditRepository.append(buildAuditEvent({ eventType: "INVITATION_REVOKED", invitationId: invitation.id, actor: { type: "USER", userId: actor.id }, reason: command.reason }), transaction as any);
    });
    return { id: invitation.id, status: "REVOKED", version: invitation.version + 1 };
  }

  async findByIdForActor(invitationId: string, actor: AuthenticatedUser) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden ver invitaciones");

    const invitation = await invitationRepository.findById(invitationId);
    if (!invitation) {
      throw new ApiError("Invitación no encontrada", 404, "NOT_FOUND");
    }

    ensureActorCanManage(actor, invitation);
    return invitation;
  }

  async listForActor(actor: AuthenticatedUser) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden listar invitaciones");
    const invitations = await invitationRepository.list(actor.role === "ADMIN" ? {} : { trainerId: actor.id, role: "STUDENT" });
    return invitations.map((invitation: any) => this.toSafeDTO(invitation));
  }

  async listPageForActor(actor: AuthenticatedUser, query: InvitationQueueQuery) {
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden listar invitaciones");
    if (actor.role === "TRAINER" && query.role && query.role !== "STUDENT") throw new ApiError("Forbidden", 403, "FORBIDDEN");
    const page = await invitationRepository.listPage({ ...query, trainerId: actor.role === "TRAINER" ? actor.id : undefined, roles: actor.role === "TRAINER" ? ["STUDENT"] : ["ADMIN", "TRAINER", "STUDENT"] });
    return { items: page.items.map((invitation: any) => this.toSafeDTO(invitation)), nextCursor: page.nextCursor };
  }

  private toSafeDTO(invitation: any) {
    return { id: invitation.id, email: invitation.email, firstName: invitation.firstName, lastName: invitation.lastName, role: invitation.role, trainerId: invitation.trainerId, status: invitation.status, deliveryStatus: invitation.deliveryStatus, expiresAt: invitation.expiresAt, createdAt: invitation.createdAt, version: invitation.version };
  }
}

export const invitationService = new InvitationService();
