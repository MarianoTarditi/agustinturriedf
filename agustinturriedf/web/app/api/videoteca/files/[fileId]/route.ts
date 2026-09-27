import { requireSession } from "@/features/auth/session";
import { videotecaService } from "@/features/videoteca/service";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { videotecaFileIdParamSchema, videotecaFileRenamePayloadSchema } from "@/lib/validation/videoteca";

type VideotecaFileRouteContext = {
  params: Promise<{
    fileId: string;
  }>;
};

const resolveVideotecaFileId = async (context: VideotecaFileRouteContext) => {
  const params = await context.params;
  const parsedParams = videotecaFileIdParamSchema.safeParse(params);

  if (!parsedParams.success) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedParams.error.flatten());
  }

  return parsedParams.data.fileId;
};

const resolveVideotecaFileRenamePayload = async (request: Request) => {
  const body = await request.json().catch(() => null);
  const parsed = videotecaFileRenamePayloadSchema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsed.error.flatten());
  }

  return parsed.data;
};

export const PATCH = async (request: Request, context: VideotecaFileRouteContext) => {
  try {
    const actor = await requireSession();
    const fileId = await resolveVideotecaFileId(context);
    const payload = await resolveVideotecaFileRenamePayload(request);
    const file = await videotecaService.renameFile(actor, fileId, payload);

    return apiSuccess(file);
  } catch (error) {
    return handleApiError(error);
  }
};

export const DELETE = async (_request: Request, context: VideotecaFileRouteContext) => {
  try {
    const actor = await requireSession();
    const fileId = await resolveVideotecaFileId(context);
    const file = await videotecaService.deleteFile(actor, fileId);

    return apiSuccess(file);
  } catch (error) {
    return handleApiError(error);
  }
};
