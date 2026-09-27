import { readFile } from "node:fs/promises";

import { requireSession } from "@/features/auth/session";
import { getRoutineAbsolutePath } from "@/features/routines/storage";
import { routinesService } from "@/features/routines/service";
import { ApiError, handleApiError } from "@/lib/http/api-response";
import { routineFileIdParamSchema } from "@/lib/validation/routines";

type RoutineFileDownloadRouteContext = {
  params: Promise<{
    fileId: string;
  }>;
};

const resolveRoutineFileId = async (context: RoutineFileDownloadRouteContext) => {
  const params = await context.params;
  const parsedParams = routineFileIdParamSchema.safeParse(params);

  if (!parsedParams.success) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedParams.error.flatten());
  }

  return parsedParams.data.fileId;
};

export const GET = async (_request: Request, context: RoutineFileDownloadRouteContext) => {
  try {
    const actor = await requireSession();
    const fileId = await resolveRoutineFileId(context);
    const routineFile = await routinesService.getFile(actor, fileId);
    const fileBuffer = await readFile(getRoutineAbsolutePath(routineFile.path));

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(routineFile.name)}"`,
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code === "ENOENT") {
      return handleApiError(new ApiError("Archivo de rutina no encontrado en storage", 404, "NOT_FOUND"));
    }

    return handleApiError(error);
  }
};
