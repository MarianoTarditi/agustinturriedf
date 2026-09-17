import { requireSession } from "@/features/auth/session";
import { auditRepository } from "@/features/audit/repository";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { userIdParamSchema } from "@/lib/validation/users";

type AuditRouteContext = { params: Promise<{ userId: string }> };

export const GET = async (request: Request, context: AuditRouteContext) => {
  try {
    const actor = await requireSession();
    const params = userIdParamSchema.safeParse(await context.params);
    if (!params.success) throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", params.error.flatten());
    const url = new URL(request.url);
    const limitValue = url.searchParams.get("limit");
    const limit = limitValue === null ? undefined : Number(limitValue);
    const history = await auditRepository.listForActor(actor, params.data.userId, {
      limit,
      cursor: url.searchParams.get("cursor") ?? undefined,
    });
    return apiSuccess(history);
  } catch (error) {
    return handleApiError(error);
  }
};
