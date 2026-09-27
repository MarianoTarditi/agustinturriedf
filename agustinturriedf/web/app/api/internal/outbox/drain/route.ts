import { createHash, timingSafeEqual } from "node:crypto";

import { outboxRepository } from "@/features/outbox/repository";
import { createProductionOutboxWorker } from "@/features/outbox/worker";

const denied = () => new Response(JSON.stringify({ success: false, error: { code: "FORBIDDEN" } }), { status: 403, headers: { "content-type": "application/json" } });
const digest = (value: string) => createHash("sha256").update(value).digest();
const authorized = (request: Request) => {
  const configured = process.env.OUTBOX_DRAIN_SECRET ?? "";
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return Boolean(configured) && timingSafeEqual(digest(token), digest(configured));
};
export const POST = async (request: Request) => {
  if (!authorized(request)) return denied();
  const result = await createProductionOutboxWorker().drain();
  return Response.json(result);
};
export const PATCH = async (request: Request) => {
  if (!authorized(request)) return denied();
  const body = await request.json().catch(() => ({}));
  if (!body || typeof body.id !== "string") return denied();
  const result = await outboxRepository.redrive(body.id);
  return Response.json({ result: result.kind }, { status: 202 });
};
