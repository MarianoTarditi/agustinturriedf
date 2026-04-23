import { requireSession } from "@/features/auth/session";
import { routinesService } from "@/features/routines/service";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { routineFolderIdParamSchema, routineObservationsSchema, routineReplaceFileIdSchema } from "@/lib/validation/routines";

type RoutineFolderFilesRouteContext = {
  params: Promise<{
    folderId: string;
  }>;
};

const resolveRoutineFolderId = async (context: RoutineFolderFilesRouteContext) => {
  const params = await context.params;
  const parsedParams = routineFolderIdParamSchema.safeParse(params);

  if (!parsedParams.success) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedParams.error.flatten());
  }

  return parsedParams.data.folderId;
};

const resolveUploadPayload = async (request: Request) => {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", {
      formErrors: ["El campo 'file' es obligatorio"],
    });
  }

  const observationsInput = formData.get("observations");

  if (observationsInput !== null && typeof observationsInput !== "string") {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", {
      fieldErrors: {
        observations: ["Las observaciones deben ser texto"],
      },
    });
  }

  const parsedObservations = routineObservationsSchema.safeParse(observationsInput ?? null);

  if (!parsedObservations.success) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedObservations.error.flatten());
  }

  const replaceFileIdInput = formData.get("replaceFileId");

  if (replaceFileIdInput !== null && typeof replaceFileIdInput !== "string") {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", {
      fieldErrors: {
        replaceFileId: ["El identificador de reemplazo debe ser texto"],
      },
    });
  }

  const parsedReplaceFileId = routineReplaceFileIdSchema.safeParse(replaceFileIdInput ?? null);

  if (!parsedReplaceFileId.success) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedReplaceFileId.error.flatten());
  }

  return {
    originalName: file.name,
    sizeBytes: file.size,
    observations: parsedObservations.data ?? null,
    replaceFileId: parsedReplaceFileId.data,
    content: Buffer.from(await file.arrayBuffer()),
  };
};

export const POST = async (request: Request, context: RoutineFolderFilesRouteContext) => {
  try {
    const actor = await requireSession();
    const folderId = await resolveRoutineFolderId(context);
    const payload = await resolveUploadPayload(request);

    const uploadedFile = await routinesService.uploadFile(actor, {
      folderId,
      originalName: payload.originalName,
      sizeBytes: payload.sizeBytes,
      observations: payload.observations,
      replaceFileId: payload.replaceFileId,
      content: payload.content,
    });

    return apiSuccess(uploadedFile, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
};
