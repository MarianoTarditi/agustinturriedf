import { requireSession } from "@/features/auth/session";
import { routinesService } from "@/features/routines/service";
import { apiSuccess, handleApiError } from "@/lib/http/api-response";

export const GET = async () => {
  try {
    const actor = await requireSession();
    const folders = await routinesService.listFolders(actor);

    return apiSuccess(folders);
  } catch (error) {
    return handleApiError(error);
  }
};
