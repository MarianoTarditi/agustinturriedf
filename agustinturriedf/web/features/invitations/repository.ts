import { createHmac, timingSafeEqual } from "crypto";

import { ApiError } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import type { InvitationQueueQuery } from "@/lib/validation/invitations";

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

type InvitationQueueRepositoryQuery = InvitationQueueQuery & { trainerId?: string; roles: readonly ("ADMIN" | "TRAINER" | "STUDENT")[] };
type InvitationCursor = { scope: string; createdAt: string; id: string };
type InvitationDeliveryTransaction = {
  invitation: {
    findUnique: (input: { where: { id: string }; select: { status: true; tokenHash: true; expiresAt: true } }) => Promise<{
      status: CreateInvitationRepositoryInput["status"];
      tokenHash: string | null;
      expiresAt: Date | null;
    } | null>;
    updateMany: (input: {
      where: { id: string; status: { in: readonly ["PENDING", "SENT"] }; tokenHash: string; expiresAt: { gt: Date } };
      data: { deliveryStatus: "SENT" | "FAILED" };
    }) => Promise<{ count: number }>;
  };
};

const queueSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new ApiError("Invitation cursor signing is not configured", 500, "CONFIGURATION_ERROR");
  return secret;
};
const queueScope = (query: InvitationQueueRepositoryQuery) => JSON.stringify({ search: query.search ?? null, status: query.status ?? null, role: query.role ?? null, trainerId: query.trainerId ?? null, roles: query.roles });
const signCursor = (payload: string) => createHmac("sha256", queueSecret()).update(payload).digest("base64url");
const parseCursor = (value: string | undefined, query: InvitationQueueRepositoryQuery): InvitationCursor | undefined => {
  if (!value) return undefined;
  try {
    const [payload, signature, extra] = value.split(".");
    if (!payload || !signature || extra) throw new Error("invalid");
    const expected = signCursor(payload);
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("invalid");
    const cursor = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as InvitationCursor;
    if (!cursor.id || cursor.scope !== queueScope(query) || Number.isNaN(new Date(cursor.createdAt).getTime())) throw new Error("invalid");
    return cursor;
  } catch { throw new ApiError("Invalid invitation cursor", 400, "VALIDATION_ERROR"); }
};
const createCursor = (invitation: { id: string; createdAt: Date }, query: InvitationQueueRepositoryQuery) => {
  const payload = Buffer.from(JSON.stringify({ scope: queueScope(query), createdAt: invitation.createdAt.toISOString(), id: invitation.id })).toString("base64url");
  return `${payload}.${signCursor(payload)}`;
};

export class InvitationRepository {
  async create(input: CreateInvitationRepositoryInput, transaction = prismaInvitations) {
    return transaction.invitation.create({ data: input });
  }

  async lockIssuanceForEmail(email: string, transaction: any) {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${email}))`;
  }

  async findActiveByEmail(email: string, now: Date, transaction = prismaInvitations) {
    return transaction.invitation.findFirst({
      where: {
        email,
        status: { in: ["PENDING", "SENT"] },
        tokenHash: { not: null },
        expiresAt: { gt: now },
      },
    });
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

  async findDeliveryState(invitationId: string, transaction: InvitationDeliveryTransaction = prismaInvitations) {
    return transaction.invitation.findUnique({
      where: { id: invitationId },
      select: { status: true, tokenHash: true, expiresAt: true },
    });
  }

  async projectDeliveryStatusIfCurrent(
    input: { invitationId: string; tokenHash: string; now: Date; deliveryStatus: "SENT" | "FAILED" },
    transaction: InvitationDeliveryTransaction
  ) {
    const result = await transaction.invitation.updateMany({
      where: {
        id: input.invitationId,
        status: { in: ["PENDING", "SENT"] },
        tokenHash: input.tokenHash,
        expiresAt: { gt: input.now },
      },
      data: { deliveryStatus: input.deliveryStatus },
    });
    return result.count === 1;
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

  async listPage(query: InvitationQueueRepositoryQuery) {
    const cursor = parseCursor(query.cursor, query);
    const invitations = await prismaInvitations.invitation.findMany({
      where: {
        role: { in: query.roles },
        ...(query.trainerId ? { trainerId: query.trainerId } : {}),
        ...(query.role ? { role: query.role } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.search ? { email: { contains: query.search, mode: "insensitive" } } : {}),
        ...(cursor ? { OR: [{ createdAt: { lt: new Date(cursor.createdAt) } }, { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } }] } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      select: { id: true, email: true, role: true, trainerId: true, status: true, deliveryStatus: true, expiresAt: true, createdAt: true, version: true },
    });
    const items = invitations.slice(0, query.limit);
    const last = items.at(-1);
    return { items, nextCursor: invitations.length > query.limit && last ? createCursor(last, query) : null };
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
