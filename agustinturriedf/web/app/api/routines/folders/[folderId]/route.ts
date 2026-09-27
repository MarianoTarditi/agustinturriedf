import { requireSession } from "@/features/auth/session";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { routineFolderIdParamSchema } from "@/lib/validation/routines";

import { routinesService } from "@/features/routines/service";

type RoutineFolderRouteContext = {
  params: Promise<{
    folderId: string;
  }>;
};

const resolveRoutineFolderId = async (context: RoutineFolderRouteContext) => {
  const params = await context.params;
  const parsedParams = routineFolderIdParamSchema.safeParse(params);

  if (!parsedParams.success) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedParams.error.flatten());
  }

  return parsedParams.data.folderId;
};

export const GET = async (_request: Request, context: RoutineFolderRouteContext) => {
  try {
    const actor = await requireSession();
    const folderId = await resolveRoutineFolderId(context);
    const folder = await routinesService.listFolderFiles(actor, folderId);

    return apiSuccess(folder);
  } catch (error) {
    return handleApiError(error);
  }
};
