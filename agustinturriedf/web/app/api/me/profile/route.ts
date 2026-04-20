import { requireSession } from "@/features/auth/session";
import { userService } from "@/features/users/service";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { stripImmutableSelfProfileFields, updateSelfProfileSchema } from "@/lib/validation/users";

export const GET = async () => {
  try {
    const actor = await requireSession();
    const ownProfile = await userService.getOwnProfile(actor.id);

    return apiSuccess(ownProfile);
  } catch (error) {
    return handleApiError(error);
  }
};

export const PATCH = async (request: Request) => {
  try {
    const actor = await requireSession();
    const payload = await request.json();
    const sanitizedPayload = stripImmutableSelfProfileFields(payload);
    const parsedPayload = updateSelfProfileSchema.safeParse(sanitizedPayload);

    if (!parsedPayload.success) {
      throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedPayload.error.flatten());
    }

    const updatedProfile = await userService.updateOwnProfile(actor.id, parsedPayload.data);

    return apiSuccess(updatedProfile);
  } catch (error) {
    return handleApiError(error);
  }
};
