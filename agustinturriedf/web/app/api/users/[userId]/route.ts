import { updateUserSchema, userIdParamSchema } from "@/lib/validation/users";

import { requireSession } from "@/features/auth/session";
import { userService } from "@/features/users/service";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";

type UserRouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

const resolveUserId = async (context: UserRouteContext) => {
  const params = await context.params;
  const parsedParams = userIdParamSchema.safeParse(params);

  if (!parsedParams.success) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedParams.error.flatten());
  }

  return parsedParams.data.userId;
};

export const GET = async (_request: Request, context: UserRouteContext) => {
  try {
    const actor = await requireSession();
    const userId = await resolveUserId(context);
    const user = await userService.getUserById(actor, userId);

    return apiSuccess(user);
  } catch (error) {
    return handleApiError(error);
  }
};

export const PATCH = async (request: Request, context: UserRouteContext) => {
  try {
    const actor = await requireSession();
    const userId = await resolveUserId(context);
    const payload = await request.json();
    const parsedPayload = updateUserSchema.safeParse(payload);

    if (!parsedPayload.success) {
      throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedPayload.error.flatten());
    }

    const updatedUser = await userService.updateUser(actor, userId, parsedPayload.data);

    return apiSuccess(updatedUser);
  } catch (error) {
    return handleApiError(error);
  }
};

export const DELETE = async (_request: Request, context: UserRouteContext) => {
  try {
    const actor = await requireSession();
    const userId = await resolveUserId(context);
    const deletedUser = await userService.deleteUser(actor, userId);

    return apiSuccess(deletedUser);
  } catch (error) {
    return handleApiError(error);
  }
};
