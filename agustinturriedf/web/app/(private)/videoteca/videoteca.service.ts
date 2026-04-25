import {
  VIDEOTECA_ALLOWED_EXTENSIONS,
  VIDEOTECA_IMAGE_MAX_SIZE_BYTES,
  VIDEOTECA_VIDEO_MAX_SIZE_BYTES,
} from "@/lib/validation/videoteca";

type ApiErrorPayload = {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
};

type ApiSuccessPayload<T> = {
  success: true;
  data: T;
};

type ApiPayload<T> = ApiSuccessPayload<T> | ApiErrorPayload;

export type CreateFolderInput = {
  name: string;
  parentId?: string | null;
};

export type VideotecaFolder = {
  id: string;
  name: string;
  parentId: string | null;
  updatedAt: string;
  fileCount: number;
  tags: string[];
};

export type VideotecaFolderParentSummary = {
  id: string;
  name: string;
};

export type UpdateFolderInput = {
  name: string;
};

export type UpdateFileInput = {
  name: string;
};

export type VideotecaFile = {
  id: string;
  folderId: string;
  name: string;
  type: "video" | "image";
  duration: string;
  updatedAt: string;
  sizeLabel: string;
  sizeBytes: number;
  orderIndex: number;
};

export type VideotecaFolderDetail = VideotecaFolder & {
  parent: VideotecaFolderParentSummary | null;
  childFolders: VideotecaFolder[];
  files: VideotecaFile[];
};

export type UploadProgressInput = {
  loaded: number;
  total: number;
};

const parseApiPayload = async <T>(response: Response): Promise<ApiPayload<T>> => {
  try {
    return (await response.json()) as ApiPayload<T>;
  } catch {
    return {
      success: false,
      error: {
        message: "Respuesta inválida del servidor",
        code: "INVALID_RESPONSE",
      },
    };
  }
};

const assertApiSuccess = <T>(payload: ApiPayload<T>, fallbackMessage: string): T => {
  if (payload.success) {
    return payload.data;
  }

  throw new Error(payload.error.message || fallbackMessage);
};

export const formatVideotecaSize = (sizeBytes: number) => {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 102.4) / 10} KB`;
  return `${Math.round(sizeBytes / 1024 / 102.4) / 10} MB`;
};

const mapApiFileToVideotecaFile = (file: {
  id: string;
  folderId: string;
  name: string;
  type: "video" | "image";
  duration: string;
  updatedAt: string;
  sizeBytes: number;
  orderIndex: number;
}): VideotecaFile => ({
  ...file,
  sizeLabel: formatVideotecaSize(file.sizeBytes),
});

export const fetchVideotecaFolderDetail = async (
  fetchImpl: typeof fetch,
  folderId: string
): Promise<VideotecaFolderDetail> => {
  const response = await fetchImpl(`/api/videoteca/folders/${encodeURIComponent(folderId)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const payload = await parseApiPayload<{
    id: string;
    name: string;
    parentId: string | null;
    updatedAt: string;
    fileCount: number;
    tags: string[];
    parent: {
      id: string;
      name: string;
    } | null;
    childFolders: Array<{
      id: string;
      name: string;
      parentId: string | null;
      updatedAt: string;
      fileCount: number;
      tags: string[];
    }>;
    files: Array<{
      id: string;
      folderId: string;
      name: string;
      type: "video" | "image";
      duration: string;
      updatedAt: string;
      sizeBytes: number;
      orderIndex: number;
    }>;
  }>(response);

  if (!response.ok) {
    throw new Error(payload.success ? "No se pudo cargar la carpeta seleccionada." : payload.error.message);
  }

  const folder = assertApiSuccess(payload, "No se pudo cargar la carpeta seleccionada.");

  return {
    ...folder,
    childFolders: folder.childFolders,
    files: folder.files.map(mapApiFileToVideotecaFile),
  };
};

export const fetchVideotecaFolders = async (fetchImpl: typeof fetch): Promise<VideotecaFolder[]> => {
  const response = await fetchImpl("/api/videoteca/folders", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const payload = await parseApiPayload<
    Array<{
      id: string;
      name: string;
      parentId: string | null;
      updatedAt: string;
      fileCount: number;
      tags: string[];
    }>
  >(response);

  if (!response.ok) {
    throw new Error(payload.success ? "No se pudieron cargar las carpetas de videoteca." : payload.error.message);
  }

  return assertApiSuccess(payload, "No se pudieron cargar las carpetas de videoteca.");
};

export const createVideotecaFolder = async (
  fetchImpl: typeof fetch,
  input: CreateFolderInput
): Promise<VideotecaFolder> => {
  const name = normalizeFolderName(input.name);

  const response = await fetchImpl("/api/videoteca/folders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      parentId: input.parentId ?? null,
    }),
  });

  const payload = await parseApiPayload<{
    id: string;
    name: string;
    parentId: string | null;
    updatedAt: string;
    fileCount: number;
    tags: string[];
  }>(response);

  if (!response.ok) {
    throw new Error(payload.success ? "No se pudo crear la carpeta." : payload.error.message);
  }

  return assertApiSuccess(payload, "No se pudo crear la carpeta.");
};

export const renameVideotecaFolder = async (
  fetchImpl: typeof fetch,
  folderId: string,
  input: UpdateFolderInput
): Promise<VideotecaFolder> => {
  const name = normalizeFolderName(input.name);

  const response = await fetchImpl(`/api/videoteca/folders/${encodeURIComponent(folderId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  const payload = await parseApiPayload<{
    id: string;
    name: string;
    parentId: string | null;
    updatedAt: string;
    fileCount: number;
    tags: string[];
  }>(response);

  if (!response.ok) {
    throw new Error(payload.success ? "No se pudo editar la carpeta." : payload.error.message);
  }

  return assertApiSuccess(payload, "No se pudo editar la carpeta.");
};

export const deleteVideotecaFolder = async (
  fetchImpl: typeof fetch,
  folderId: string
): Promise<VideotecaFolder> => {
  const response = await fetchImpl(`/api/videoteca/folders/${encodeURIComponent(folderId)}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const payload = await parseApiPayload<{
    id: string;
    name: string;
    parentId: string | null;
    updatedAt: string;
    fileCount: number;
    tags: string[];
  }>(response);

  if (!response.ok) {
    throw new Error(payload.success ? "No se pudo eliminar la carpeta." : payload.error.message);
  }

  return assertApiSuccess(payload, "No se pudo eliminar la carpeta.");
};

export const uploadVideotecaFile = (
  folderId: string,
  file: File,
  callbacks?: {
    onProgress?: (progress: UploadProgressInput) => void;
  }
) => {
  return new Promise<VideotecaFile>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/videoteca/folders/${encodeURIComponent(folderId)}/files`);

    xhr.upload.addEventListener("progress", (event) => {
      callbacks?.onProgress?.({
        loaded: event.loaded,
        total: event.total,
      });
    });

    xhr.addEventListener("load", () => {
      let payload: ApiPayload<
        Array<{
          id: string;
          folderId: string;
          name: string;
          type: "video" | "image";
          duration: string;
          updatedAt: string;
          sizeBytes: number;
          orderIndex: number;
        }>
      >;

      try {
        payload = JSON.parse(xhr.responseText) as ApiPayload<
          Array<{
            id: string;
            folderId: string;
            name: string;
            type: "video" | "image";
            duration: string;
            updatedAt: string;
            sizeBytes: number;
            orderIndex: number;
          }>
        >;
      } catch {
        reject(new Error("Respuesta inválida del servidor"));
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300 || !payload.success) {
        reject(new Error(payload.success ? "No se pudo subir el archivo." : payload.error.message));
        return;
      }

      const uploadedItem = payload.data[0];

      if (!uploadedItem) {
        reject(new Error("No se recibió archivo subido desde el servidor"));
        return;
      }

      resolve(mapApiFileToVideotecaFile(uploadedItem));
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Error de red durante la subida"));
    });

    const formData = new FormData();
    formData.append("files", file);
    xhr.send(formData);
  });
};

export const renameVideotecaFile = async (
  fetchImpl: typeof fetch,
  fileId: string,
  input: UpdateFileInput
): Promise<VideotecaFile> => {
  const name = input.name.trim().replace(/\s+/g, " ");

  const response = await fetchImpl(`/api/videoteca/files/${encodeURIComponent(fileId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  const payload = await parseApiPayload<{
    id: string;
    folderId: string;
    name: string;
    type: "video" | "image";
    duration: string;
    updatedAt: string;
    sizeBytes: number;
    orderIndex: number;
  }>(response);

  if (!response.ok) {
    throw new Error(payload.success ? "No se pudo renombrar el archivo." : payload.error.message);
  }

  return mapApiFileToVideotecaFile(assertApiSuccess(payload, "No se pudo renombrar el archivo."));
};

export const deleteVideotecaFile = async (
  fetchImpl: typeof fetch,
  fileId: string
): Promise<VideotecaFile> => {
  const response = await fetchImpl(`/api/videoteca/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const payload = await parseApiPayload<{
    id: string;
    folderId: string;
    name: string;
    type: "video" | "image";
    duration: string;
    updatedAt: string;
    sizeBytes: number;
    orderIndex: number;
  }>(response);

  if (!response.ok) {
    throw new Error(payload.success ? "No se pudo eliminar el archivo." : payload.error.message);
  }

  return mapApiFileToVideotecaFile(assertApiSuccess(payload, "No se pudo eliminar el archivo."));
};

export const downloadVideotecaFile = async (fetchImpl: typeof fetch, file: VideotecaFile): Promise<void> => {
  const response = await fetchImpl(`/api/videoteca/files/${encodeURIComponent(file.id)}/download`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await parseApiPayload<unknown>(response);
    throw new Error(payload.success ? "No se pudo descargar el archivo." : payload.error.message);
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition") ?? "";
  const encodedFilenameMatch = contentDisposition.match(/filename="([^"]+)"/i);
  const decodedFilename = encodedFilenameMatch?.[1]
    ? decodeURIComponent(encodedFilenameMatch[1])
    : `${file.name.replace(/[\\/:*?"<>|]+/g, "-")}`;

  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = decodedFilename;
  anchor.click();
  URL.revokeObjectURL(blobUrl);
};

const allowedExtensionsSet = new Set<string>(VIDEOTECA_ALLOWED_EXTENSIONS);
const imageExtensionsSet = new Set<string>(["jpg", "jpeg", "png", "webp"]);

export const validateVideotecaFileForUpload = (file: File) => {
  const extension = extractExtension(file.name);

  if (!extension || !allowedExtensionsSet.has(extension)) {
    return {
      ok: false as const,
      error:
        "Formato no permitido. Usá: jpg, jpeg, png, webp, mp4, mov o webm.",
    };
  }

  const maxSize = imageExtensionsSet.has(extension)
    ? VIDEOTECA_IMAGE_MAX_SIZE_BYTES
    : VIDEOTECA_VIDEO_MAX_SIZE_BYTES;

  if (file.size > maxSize) {
    return {
      ok: false as const,
      error: imageExtensionsSet.has(extension)
        ? "La imagen supera el máximo de 10 MB."
        : "El video supera el máximo de 200 MB.",
    };
  }

  if (file.size === 0) {
    return {
      ok: false as const,
      error: "El archivo no puede estar vacío.",
    };
  }

  return {
    ok: true as const,
  };
};

const extractExtension = (fileName: string) => {
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return null;
  }

  return fileName.slice(lastDotIndex + 1).toLowerCase();
};

export function normalizeFolderName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}
