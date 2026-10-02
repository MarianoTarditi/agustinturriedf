import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { requireSession } from "@/features/auth/session";
import { getVideotecaAbsolutePath } from "@/features/videoteca/storage";
import { videotecaService } from "@/features/videoteca/service";
import { ApiError, handleApiError } from "@/lib/http/api-response";
import { videotecaFileIdParamSchema } from "@/lib/validation/videoteca";

type VideotecaFileViewRouteContext = {
  params: Promise<{
    fileId: string;
  }>;
};

export const runtime = "nodejs";

const MIME_TYPE_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

type ByteRange = {
  start: number;
  end: number;
};

const parseByteRange = (rangeHeader: string, fileSize: number): ByteRange | null => {
  if (fileSize <= 0) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match || (!match[1] && !match[2])) return null;

  const startValue = match[1] ? Number(match[1]) : null;
  const endValue = match[2] ? Number(match[2]) : null;

  if (
    (startValue !== null && !Number.isSafeInteger(startValue)) ||
    (endValue !== null && !Number.isSafeInteger(endValue))
  ) {
    return null;
  }

  if (startValue === null) {
    if (endValue === null || endValue <= 0) return null;

    return {
      start: Math.max(fileSize - endValue, 0),
      end: fileSize - 1,
    };
  }

  if (startValue >= fileSize) return null;

  const end = endValue === null ? fileSize - 1 : Math.min(endValue, fileSize - 1);
  if (end < startValue) return null;

  return { start: startValue, end };
};

const resolveVideotecaFileId = async (context: VideotecaFileViewRouteContext) => {
  const params = await context.params;
  const parsedParams = videotecaFileIdParamSchema.safeParse(params);

  if (!parsedParams.success) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedParams.error.flatten());
  }

  return parsedParams.data.fileId;
};

export const GET = async (request: Request, context: VideotecaFileViewRouteContext) => {
  try {
    const actor = await requireSession();
    const fileId = await resolveVideotecaFileId(context);
    const videotecaFile = await videotecaService.getFile(actor, fileId);
    const absolutePath = getVideotecaAbsolutePath(videotecaFile.path);
    const fileStats = await stat(absolutePath);

    if (!fileStats.isFile()) {
      throw new ApiError("Archivo de videoteca no encontrado en storage", 404, "NOT_FOUND");
    }

    const contentType = MIME_TYPE_MAP[videotecaFile.extension] ?? "application/octet-stream";
    const rangeHeader = request.headers.get("range");
    const range = rangeHeader ? parseByteRange(rangeHeader, fileStats.size) : null;

    if (rangeHeader && !range) {
      return new Response(null, {
        status: 416,
        headers: {
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes */${fileStats.size}`,
        },
      });
    }

    const fileStream = range
      ? createReadStream(absolutePath, { start: range.start, end: range.end })
      : createReadStream(absolutePath);
    const webStream = Readable.toWeb(fileStream) as ReadableStream;
    const headers = new Headers({
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
    });

    if (range) {
      headers.set("Content-Length", String(range.end - range.start + 1));
      headers.set("Content-Range", `bytes ${range.start}-${range.end}/${fileStats.size}`);
    } else if (Number.isFinite(fileStats.size) && fileStats.size >= 0) {
      headers.set("Content-Length", String(fileStats.size));
    }

    return new Response(webStream, {
      status: range ? 206 : 200,
      headers,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code === "ENOENT") {
      return handleApiError(new ApiError("Archivo de videoteca no encontrado en storage", 404, "NOT_FOUND"));
    }

    return handleApiError(error);
  }
};
