import { requireSession } from "@/features/auth/session";
import { userService } from "@/features/users/service";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { assignTrainerSchema, userIdParamSchema } from "@/lib/validation/users";

type AssignmentRouteContext = { params: Promise<{ userId: string }> };

export const PATCH = async (request: Request, context: AssignmentRouteContext) => {
  try {
    const actor = await requireSession();
    const params = userIdParamSchema.safeParse(await context.params);
    const payload = assignTrainerSchema.safeParse(await request.json());
    if (!params.success) throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", params.error.flatten());
    if (!payload.success) throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", payload.error.flatten());
    return apiSuccess(await userService.assignTrainer(actor, params.data.userId, payload.data));
  } catch (error) {
    return handleApiError(error);
  }
};
