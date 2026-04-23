import { requireSession } from "@/features/auth/session";
import { videotecaService } from "@/features/videoteca/service";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { videotecaFolderIdParamSchema } from "@/lib/validation/videoteca";

type VideotecaFolderFilesRouteContext = {
  params: Promise<{
    folderId: string;
  }>;
};

const resolveVideotecaFolderId = async (context: VideotecaFolderFilesRouteContext) => {
  const params = await context.params;
  const parsedParams = videotecaFolderIdParamSchema.safeParse(params);

  if (!parsedParams.success) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedParams.error.flatten());
  }

  return parsedParams.data.folderId;
};

const resolveUploadPayload = async (request: Request) => {
  const formData = await request.formData();
  const allFileEntries = formData.getAll("files");

  const fallbackSingleFile = formData.get("file");
  const fileCandidates = [
    ...allFileEntries,
    ...(allFileEntries.length === 0 && fallbackSingleFile !== null ? [fallbackSingleFile] : []),
  ];

  const files = fileCandidates.filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", {
      formErrors: ["Debés enviar al menos un archivo en el campo 'files'"],
    });
  }

  return Promise.all(
    files.map(async (file) => ({
      originalName: file.name,
      sizeBytes: file.size,
      content: Buffer.from(await file.arrayBuffer()),
    }))
  );
};

export const POST = async (request: Request, context: VideotecaFolderFilesRouteContext) => {
  try {
    const actor = await requireSession();
    const folderId = await resolveVideotecaFolderId(context);
    const files = await resolveUploadPayload(request);
    const uploadedFiles = await videotecaService.uploadFiles(actor, {
      folderId,
      files,
    });

    return apiSuccess(uploadedFiles, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
};
