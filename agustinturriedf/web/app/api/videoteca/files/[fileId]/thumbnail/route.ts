import { requireSession } from "@/features/auth/session";
import { videotecaService } from "@/features/videoteca/service";
import { getVideotecaAbsolutePath } from "@/features/videoteca/storage";
import { ApiError, handleApiError } from "@/lib/http/api-response";
import { videotecaFileIdParamSchema } from "@/lib/validation/videoteca";
import { readFile } from "node:fs/promises";
import path from "node:path";

type VideotecaFileThumbnailRouteContext = {
  params: Promise<{
    fileId: string;
  }>;
};

export const runtime = "nodejs";

const resolveVideotecaFileId = async (context: VideotecaFileThumbnailRouteContext) => {
  const params = await context.params;
  const parsedParams = videotecaFileIdParamSchema.safeParse(params);

  if (!parsedParams.success) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedParams.error.flatten());
  }

  return parsedParams.data.fileId;
};

export const GET = async (_request: Request, context: VideotecaFileThumbnailRouteContext) => {
  try {
    await requireSession();
    const fileId = await resolveVideotecaFileId(context);

    const file = await videotecaService.getFileRaw(fileId);

    if (!file.thumbnailPath) {
      throw new ApiError("Thumbnail not available", 404, "NOT_FOUND");
    }

    const absolutePath = getVideotecaAbsolutePath(file.thumbnailPath);
    const thumbnailBuffer = await readFile(absolutePath);

    return new Response(thumbnailBuffer, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
};