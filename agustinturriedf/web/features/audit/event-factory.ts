import { ApiError } from "@/lib/http/api-response";

type AuditActor =
  | { type: "USER"; userId: string }
  | { type: "SYSTEM" }
  | { type: "SUBJECT"; userId: string };

type AuditEventInput = {
  eventType: string;
  subjectUserId?: string;
  invitationId?: string;
  actor: AuditActor;
  reason?: string;
  summary?: Record<string, unknown>;
};

const summaryFields = new Set(["changedFields", "fromStatus", "toStatus", "deliveryStatus", "resourceType"]);
const maxReasonLength = 500;
const sensitiveValuePattern = /(?:[?&](?:(?:token|password|secret|authorization)(?:hash)?|bearer)=[^&\s]+|(?:(?:token|password|secret|authorization)(?:hash)?|bearer)\s*(?:=|:)|authorization\s+bearer\b)/i;

const containsSensitiveValue = (value: string) => sensitiveValuePattern.test(value);

const safeSummary = (summary: Record<string, unknown> = {}) => {
  const safe: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(summary)) {
    if (!summaryFields.has(key)) continue;
    if (typeof value === "string" && !containsSensitiveValue(value)) safe[key] = value.slice(0, 200);
    if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
      safe[key] = value.filter((entry) => !containsSensitiveValue(entry)).slice(0, 20).map((entry) => entry.slice(0, 100));
    }
  }
  return safe;
};

export const buildAuditEvent = (input: AuditEventInput) => {
  const reason = input.reason?.trim();
  if (reason !== undefined && (!reason || reason.length > maxReasonLength)) {
    throw new ApiError("Audit reason must be between 1 and 500 characters", 400, "VALIDATION_ERROR");
  }
  if (reason && containsSensitiveValue(reason)) {
    throw new ApiError("Audit content must not contain secrets", 400, "VALIDATION_ERROR");
  }
  if (input.actor.type === "SUBJECT" && !input.subjectUserId) {
    throw new ApiError("Subject actor requires a subject user", 400, "VALIDATION_ERROR");
  }
  if (input.actor.type === "SUBJECT" && input.actor.userId !== input.subjectUserId) {
    throw new ApiError("Subject actor must match the subject user", 400, "VALIDATION_ERROR");
  }

  return {
    eventType: input.eventType,
    subjectUserId: input.subjectUserId,
    invitationId: input.invitationId,
    actorType: input.actor.type,
    actorUserId: input.actor.type === "SYSTEM" ? undefined : input.actor.userId,
    reason,
    summary: safeSummary(input.summary),
  };
};
