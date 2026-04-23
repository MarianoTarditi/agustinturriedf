import { requireSession } from "@/features/auth/session";
import { videotecaService } from "@/features/videoteca/service";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { videotecaFolderIdParamSchema } from "@/lib/validation/videoteca";

type VideotecaFolderRouteContext = {
  params: Promise<{
    folderId: string;
  }>;
};

const resolveVideotecaFolderId = async (context: VideotecaFolderRouteContext) => {
  const params = await context.params;
  const parsedParams = videotecaFolderIdParamSchema.safeParse(params);

  if (!parsedParams.success) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedParams.error.flatten());
  }

  return parsedParams.data.folderId;
};

export const GET = async (_request: Request, context: VideotecaFolderRouteContext) => {
  try {
    const actor = await requireSession();
    const folderId = await resolveVideotecaFolderId(context);
    const folder = await videotecaService.getFolderDetail(actor, folderId);

    return apiSuccess(folder);
  } catch (error) {
    return handleApiError(error);
  }
};
