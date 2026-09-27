import { requireSession } from "@/features/auth/session";
import { routinesService } from "@/features/routines/service";
import { apiSuccess, handleApiError } from "@/lib/http/api-response";

export const GET = async () => {
  try {
    const actor = await requireSession();
    const ownFolder = await routinesService.listOwnFolder(actor);

    return apiSuccess(ownFolder);
  } catch (error) {
    return handleApiError(error);
  }
};
