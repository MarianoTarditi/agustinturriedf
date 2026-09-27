import type { AuthenticatedUser } from "@/features/auth/authorization";
import { requireUserReadAccess } from "@/features/users/policy";
import { ApiError } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";

import type { buildAuditEvent } from "./event-factory";

type AuditClient = { auditEvent: { create: (input: { data: unknown }) => Promise<unknown> } };
type AuditQuery = { limit?: number; cursor?: string };
type Cursor = { subjectUserId: string; sort: "createdAt:asc,id:asc"; createdAt: string; id: string };
const defaultLimit = 25;
const maxLimit = 100;

const cursorSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new ApiError("Audit cursor signing is not configured", 500, "CONFIGURATION_ERROR");
  return secret;
};

const signCursor = (payload: string) => createHmac("sha256", cursorSecret()).update(payload).digest("base64url");

const parseCursor = (value: string | undefined, subjectUserId: string): Cursor | undefined => {
  if (!value) return undefined;
  try {
    const cursorParts = value.split(".");
    if (cursorParts.length !== 2 || cursorParts.some((part) => !part)) throw new Error("Invalid cursor");
    const [payload, signature] = cursorParts;
    const expectedSignature = signCursor(payload);
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) throw new Error("Invalid cursor");
    const cursor = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Cursor;
    if (
      !cursor.id ||
      cursor.subjectUserId !== subjectUserId ||
      cursor.sort !== "createdAt:asc,id:asc" ||
      Number.isNaN(new Date(cursor.createdAt).getTime())
    ) throw new Error("Invalid cursor");
    return cursor;
  } catch {
    throw new ApiError("Invalid audit cursor", 400, "VALIDATION_ERROR");
  }
};

const getLimit = (value?: number) => {
  const limit = value ?? defaultLimit;
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    throw new ApiError("Audit limit must be between 1 and 100", 400, "VALIDATION_ERROR");
  }
  return limit;
};

export class AuditRepository {
  async append(input: ReturnType<typeof buildAuditEvent>, transactionOverride?: AuditClient) {
    const client = transactionOverride ?? (prisma as unknown as AuditClient);
    return client.auditEvent.create({ data: input });
  }

  async listForActor(actor: AuthenticatedUser, subjectUserId: string, query: AuditQuery = {}) {
    const prismaAudit = prisma as any;
    const subject = await prismaAudit.user.findUnique({
      where: { id: subjectUserId },
      select: { id: true, role: true },
    });
    if (!subject) throw new ApiError("Usuario no encontrado", 404, "NOT_FOUND");
    requireUserReadAccess(actor, subject);

    const limit = getLimit(query.limit);
    const cursor = parseCursor(query.cursor, subjectUserId);
    const events = await prismaAudit.auditEvent.findMany({
      where: {
        subjectUserId,
        ...(cursor
          ? { OR: [{ createdAt: { gt: new Date(cursor.createdAt) } }, { createdAt: new Date(cursor.createdAt), id: { gt: cursor.id } }] }
          : {}),
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: limit + 1,
      select: { id: true, eventType: true, actorType: true, reason: true, summary: true, createdAt: true, invitationId: true },
    });
    const hasMore = events.length > limit;
    const items = events.slice(0, limit);
    const last = items.at(-1);

    return {
      items,
      nextCursor:
        hasMore && last
          ? (() => {
              const payload = Buffer.from(
                JSON.stringify({ subjectUserId, sort: "createdAt:asc,id:asc", createdAt: last.createdAt.toISOString(), id: last.id })
              ).toString("base64url");
              return `${payload}.${signCursor(payload)}`;
            })()
          : null,
    };
  }
}

export const auditRepository = new AuditRepository();
import { createHmac, timingSafeEqual } from "node:crypto";
