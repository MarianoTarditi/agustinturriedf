import { requireSession } from "@/features/auth/session";
import { videotecaService } from "@/features/videoteca/service";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { videotecaFolderPayloadSchema } from "@/lib/validation/videoteca";

const resolveFolderPayload = async (request: Request) => {
  const body = await request.json().catch(() => null);
  const parsed = videotecaFolderPayloadSchema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsed.error.flatten());
  }

  return parsed.data;
};

export const GET = async () => {
  try {
    const actor = await requireSession();
    const folders = await videotecaService.listFolders(actor);

    return apiSuccess(folders);
  } catch (error) {
    return handleApiError(error);
  }
};

export const POST = async (request: Request) => {
  try {
    const actor = await requireSession();
    const payload = await resolveFolderPayload(request);
    const folder = await videotecaService.createFolder(actor, payload);

    return apiSuccess(folder, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
};
