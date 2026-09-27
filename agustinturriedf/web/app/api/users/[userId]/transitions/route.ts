import { z } from "zod";

import { requireSession } from "@/features/auth/session";
import { userService } from "@/features/users/service";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { userIdParamSchema } from "@/lib/validation/users";

const transitionSchema = z.object({
  targetStatus: z.enum(["ACTIVE", "INACTIVE", "BLOCKED", "ARCHIVED"]),
  expectedVersion: z.number().int().positive(),
  reason: z.string().trim().min(1).max(500),
});

type TransitionRouteContext = {
  params: Promise<{ userId: string }>;
};

const resolveUserId = async (context: TransitionRouteContext) => {
  const parsedParams = userIdParamSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedParams.error.flatten());
  }
  return parsedParams.data.userId;
};

export const PATCH = async (request: Request, context: TransitionRouteContext) => {
  try {
    const actor = await requireSession();
    const userId = await resolveUserId(context);
    const parsedPayload = transitionSchema.safeParse(await request.json());
    if (!parsedPayload.success) {
      throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedPayload.error.flatten());
    }

    return apiSuccess(await userService.transitionUser(actor, userId, parsedPayload.data));
  } catch (error) {
    return handleApiError(error);
  }
};

export const DELETE = async () => new Response(null, { status: 405, headers: { Allow: "PATCH" } });
