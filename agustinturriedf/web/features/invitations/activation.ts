import { createHash, randomBytes } from "node:crypto";

import { hash } from "bcryptjs";

import { buildAuditEvent } from "@/features/audit/event-factory";
import { auditRepository } from "@/features/audit/repository";
import { userRepository } from "@/features/users/repository";
import { encryptPayload } from "@/features/outbox/crypto";
import { outboxRepository } from "@/features/outbox/repository";
import { ApiError } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";

const SESSION_DURATION_MS = 10 * 60 * 1000;
const PASSWORD_HASH_ROUNDS = 12;
const tokenHash = (value: string) => createHash("sha256").update(value).digest("hex");
const outboxKey = () => {
  const value = process.env.OUTBOX_ENCRYPTION_KEY?.trim();
  if (!value) throw new ApiError("Outbox encryption is not configured", 500, "OUTBOX_CONFIG_MISSING");
  return { id: process.env.OUTBOX_ENCRYPTION_KEY_ID?.trim() || "current", value };
};

const invalidActivation = () => new ApiError("Token inválido o expirado", 400, "INVALID_OR_EXPIRED_TOKEN");

const requirePassword = (password: string) => {
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
    throw new ApiError("Password does not meet the activation policy", 400, "VALIDATION_ERROR");
  }
};

type Transaction = any;
type Database = { $transaction: <T>(operation: (transaction: Transaction) => Promise<T>) => Promise<T> };

export class ActivationPrimitives {
  constructor(
    private readonly now: () => Date = () => new Date(),
    private readonly createSessionValue: () => string = () => randomBytes(32).toString("base64url"),
    private readonly database: Database = prisma as unknown as Database
  ) {}

  async exchange(invitationToken: string) {
    const now = this.now();
    const session = this.createSessionValue();
    const sessionHash = tokenHash(session);

    await this.database.$transaction(async (transaction) => {
      const invitation = await transaction.invitation.findFirst({
        where: { tokenHash: tokenHash(invitationToken), status: { in: ["PENDING", "SENT"] }, expiresAt: { gt: now } },
      });
      if (!invitation) throw invalidActivation();
      const exchanged = await transaction.invitation.updateMany({
        where: { id: invitation.id, tokenHash: tokenHash(invitationToken), status: { in: ["PENDING", "SENT"] }, expiresAt: { gt: now } },
        data: { tokenHash: sessionHash, version: { increment: 1 } },
      });
      if (exchanged.count !== 1) throw invalidActivation();
      await transaction.activationSession.create({
        data: { invitationId: invitation.id, sessionHash, expiresAt: new Date(now.getTime() + SESSION_DURATION_MS) },
      });
    });

    return { session };
  }

  async activate(input: { session: string; password: string }) {
    requirePassword(input.password);
    const now = this.now();
    const sessionHash = tokenHash(input.session);
    const passwordHash = await hash(input.password, PASSWORD_HASH_ROUNDS);

    return this.database.$transaction(async (transaction) => {
      const activationSession = await transaction.activationSession.findFirst({
        where: {
          sessionHash,
          consumedAt: null,
          expiresAt: { gt: now },
          invitation: { status: { in: ["PENDING", "SENT"] }, tokenHash: sessionHash, expiresAt: { gt: now } },
        },
        include: { invitation: true },
      });
      if (!activationSession) throw invalidActivation();

      const sessionConsumed = await transaction.activationSession.updateMany({
        where: { id: activationSession.id, sessionHash, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (sessionConsumed.count !== 1) throw invalidActivation();

      const invitationConsumed = await transaction.invitation.updateMany({
        where: { id: activationSession.invitation.id, status: { in: ["PENDING", "SENT"] }, tokenHash: sessionHash, expiresAt: { gt: now } },
        data: { status: "CONSUMED", consumedAt: now, tokenHash: null, version: { increment: 1 } },
      });
      if (invitationConsumed.count !== 1) throw invalidActivation();

      const invitation = activationSession.invitation;
      if (invitation.role === "STUDENT" && !invitation.trainerId) throw invalidActivation();
      const user = await userRepository.create(
        {
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          email: invitation.email,
          role: invitation.role,
          passwordHash,
          phone: invitation.phone,
          birthDate: invitation.birthDate,
          gender: invitation.gender,
          heightCm: invitation.heightCm,
          weightKg: invitation.weightKg,
          studentProfile: invitation.role === "STUDENT"
            ? { trainerId: invitation.trainerId, status: "ACTIVE", initialPaymentStartDate: invitation.initialPaymentStartDate }
            : undefined,
        },
        transaction
      );
      await auditRepository.append(
        buildAuditEvent({ eventType: "ACTIVATION_COMPLETED", subjectUserId: user.id, invitationId: invitation.id, actor: { type: "SUBJECT", userId: user.id } }),
        transaction
      );
      if (user.role === "STUDENT" && user.studentProfile) {
        await outboxRepository.enqueue(
          {
            messageType: "ROUTINE_PROVISION",
            resourceType: "STUDENT_PROFILE",
            resourceId: user.studentProfile.id,
            idempotencyKey: `activation:${invitation.id}:provision`,
            payloadEncrypted: encryptPayload({ studentProfileId: user.studentProfile.id }, outboxKey()),
          },
          transaction
        );
      }

      return { userId: user.id };
    });
  }
}

export const activationPrimitives = new ActivationPrimitives();
