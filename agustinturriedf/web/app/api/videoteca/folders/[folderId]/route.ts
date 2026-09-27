import { requireSession } from "@/features/auth/session";
import { videotecaService } from "@/features/videoteca/service";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { videotecaFolderIdParamSchema, videotecaFolderPayloadSchema } from "@/lib/validation/videoteca";

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

const resolveFolderPayload = async (request: Request) => {
  const body = await request.json().catch(() => null);
  const parsed = videotecaFolderPayloadSchema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsed.error.flatten());
  }

  return parsed.data;
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

export const PATCH = async (request: Request, context: VideotecaFolderRouteContext) => {
  try {
    const actor = await requireSession();
    const folderId = await resolveVideotecaFolderId(context);
    const payload = await resolveFolderPayload(request);
    const folder = await videotecaService.renameFolder(actor, folderId, payload);

    return apiSuccess(folder);
  } catch (error) {
    return handleApiError(error);
  }
};

export const DELETE = async (_request: Request, context: VideotecaFolderRouteContext) => {
  try {
    const actor = await requireSession();
    const folderId = await resolveVideotecaFolderId(context);
    const folder = await videotecaService.deleteFolder(actor, folderId);

    return apiSuccess(folder);
  } catch (error) {
    return handleApiError(error);
  }
};
