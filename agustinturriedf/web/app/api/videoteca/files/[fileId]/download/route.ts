import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { requireSession } from "@/features/auth/session";
import { getVideotecaAbsolutePath } from "@/features/videoteca/storage";
import { videotecaService } from "@/features/videoteca/service";
import { ApiError, handleApiError } from "@/lib/http/api-response";
import { videotecaFileIdParamSchema } from "@/lib/validation/videoteca";

type VideotecaFileDownloadRouteContext = {
  params: Promise<{
    fileId: string;
  }>;
};

export const runtime = "nodejs";

const resolveVideotecaFileId = async (context: VideotecaFileDownloadRouteContext) => {
  const params = await context.params;
  const parsedParams = videotecaFileIdParamSchema.safeParse(params);

  if (!parsedParams.success) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedParams.error.flatten());
  }

  return parsedParams.data.fileId;
};

export const GET = async (_request: Request, context: VideotecaFileDownloadRouteContext) => {
  try {
    const actor = await requireSession();
    const fileId = await resolveVideotecaFileId(context);
    const videotecaFile = await videotecaService.getFile(actor, fileId);
    const absolutePath = getVideotecaAbsolutePath(videotecaFile.path);
    const fileStats = await stat(absolutePath);

    if (!fileStats.isFile()) {
      throw new ApiError("Archivo de videoteca no encontrado en storage", 404, "NOT_FOUND");
    }

    const fileStream = createReadStream(absolutePath);
    const webStream = Readable.toWeb(fileStream) as ReadableStream;
    const headers = new Headers({
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(videotecaFile.name)}"`,
    });

    if (Number.isFinite(fileStats.size) && fileStats.size >= 0) {
      headers.set("Content-Length", String(fileStats.size));
    }

    return new Response(webStream, {
      status: 200,
      headers,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code === "ENOENT") {
      return handleApiError(new ApiError("Archivo de videoteca no encontrado en storage", 404, "NOT_FOUND"));
    }

    return handleApiError(error);
  }
};
