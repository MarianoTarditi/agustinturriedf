import { createUserSchema } from "@/lib/validation/users";

import { requireSession } from "@/features/auth/session";
import { userService } from "@/features/users/service";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";

export const GET = async () => {
  try {
    const actor = await requireSession();
    const users = await userService.listUsers(actor);

    return apiSuccess(users);
  } catch (error) {
    return handleApiError(error);
  }
};

export const POST = async (request: Request) => {
  try {
    const actor = await requireSession();
    const payload = await request.json();
    const parsedPayload = createUserSchema.safeParse(payload);

    if (!parsedPayload.success) {
      throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedPayload.error.flatten());
    }

    const createdUser = await userService.createUser(actor, parsedPayload.data);

    return apiSuccess(createdUser, {
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
};
