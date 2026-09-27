import { requireSession } from "@/features/auth/session";
import { routinesService } from "@/features/routines/service";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { routineFileIdParamSchema } from "@/lib/validation/routines";

type RoutineFileRouteContext = {
  params: Promise<{
    fileId: string;
  }>;
};

const resolveRoutineFileId = async (context: RoutineFileRouteContext) => {
  const params = await context.params;
  const parsedParams = routineFileIdParamSchema.safeParse(params);

  if (!parsedParams.success) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedParams.error.flatten());
  }

  return parsedParams.data.fileId;
};

export const DELETE = async (_request: Request, context: RoutineFileRouteContext) => {
  try {
    const actor = await requireSession();
    const fileId = await resolveRoutineFileId(context);
    const deletedFile = await routinesService.deleteFile(actor, fileId);

    return apiSuccess(deletedFile);
  } catch (error) {
    return handleApiError(error);
  }
};
