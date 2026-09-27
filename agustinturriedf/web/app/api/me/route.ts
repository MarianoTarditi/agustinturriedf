import { requireSession } from "@/features/auth/session";
import { userService } from "@/features/users/service";
import { apiSuccess, handleApiError } from "@/lib/http/api-response";

export const GET = async () => {
  try {
    const actor = await requireSession();
    const currentUser = await userService.getUserById(actor, actor.id);

    return apiSuccess(currentUser);
  } catch (error) {
    return handleApiError(error);
  }
};
