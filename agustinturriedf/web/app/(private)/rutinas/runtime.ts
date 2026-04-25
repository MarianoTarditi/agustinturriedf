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

export type RoutineFileType = "pdf" | "xls" | "xlsx";

export type RoutineFile = {
  id: string;
  name: string;
  type: RoutineFileType;
  path: string;
  uploadedAt: string;
  sizeBytes: number;
  observations: string | null;
};

export type RoutineFolderSummary = {
  id: string;
  studentProfileId: string;
  studentUserId: string;
  displayName: string;
  storageKey: string;
  fileCount: number;
  firstName: string;
  lastName: string;
  email: string;
};

export type RoutineFolder = RoutineFolderSummary & {
  files: RoutineFile[];
};

export type RoutinesViewData =
  | {
      role: "STUDENT";
      folder: RoutineFolder | null;
    }
  | {
      role: "STAFF";
      folders: RoutineFolderSummary[];
    };

export type RoutineUiPermissions = {
  canUploadFiles: boolean;
  canDeleteFiles: boolean;
  canCreateFolders: boolean;
  canDeleteFolders: boolean;
};

export type RoutineUploadValidationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export const getRoutineUiPermissions = (viewData: RoutinesViewData | null): RoutineUiPermissions => {
  if (!viewData) {
    return {
      canUploadFiles: false,
      canDeleteFiles: false,
      canCreateFolders: false,
      canDeleteFolders: false,
    };
  }

  if (viewData.role === "STUDENT") {
    return {
      canUploadFiles: false,
      canDeleteFiles: false,
      canCreateFolders: false,
      canDeleteFolders: false,
    };
  }

  return {
    canUploadFiles: true,
    canDeleteFiles: true,
    canCreateFolders: false,
    canDeleteFolders: false,
  };
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

export const loadRoutinesViewData = async (fetchImpl: typeof fetch): Promise<RoutinesViewData> => {
  const ownFolderResponse = await fetchImpl("/api/me/routines", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const ownFolderPayload = await parseApiPayload<RoutineFolder>(ownFolderResponse);

  if (ownFolderResponse.ok && ownFolderPayload.success) {
    return {
      role: "STUDENT",
      folder: ownFolderPayload.data,
    };
  }

  if (ownFolderResponse.status === 404) {
    return {
      role: "STUDENT",
      folder: null,
    };
  }

  if (ownFolderResponse.status !== 403) {
    throw new Error(ownFolderPayload.success ? "No se pudo cargar tu carpeta de rutinas." : ownFolderPayload.error.message);
  }

  const foldersResponse = await fetchImpl("/api/routines/folders", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const foldersPayload = await parseApiPayload<RoutineFolderSummary[]>(foldersResponse);

  if (!foldersResponse.ok) {
    throw new Error(foldersPayload.success ? "No se pudieron cargar las carpetas de rutinas." : foldersPayload.error.message);
  }

  return {
    role: "STAFF",
    folders: assertApiSuccess(foldersPayload, "No se pudieron cargar las carpetas de rutinas."),
  };
};

export const fetchRoutineFolderDetail = async (fetchImpl: typeof fetch, folderId: string): Promise<RoutineFolder> => {
  const response = await fetchImpl(`/api/routines/folders/${encodeURIComponent(folderId)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const payload = await parseApiPayload<RoutineFolder>(response);

  if (!response.ok) {
    throw new Error(payload.success ? "No se pudo cargar la carpeta seleccionada." : payload.error.message);
  }

  return assertApiSuccess(payload, "No se pudo cargar la carpeta seleccionada.");
};

export const fetchRoutineFolders = async (fetchImpl: typeof fetch): Promise<RoutineFolderSummary[]> => {
  const response = await fetchImpl("/api/routines/folders", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const payload = await parseApiPayload<RoutineFolderSummary[]>(response);

  if (!response.ok) {
    throw new Error(payload.success ? "No se pudieron cargar las carpetas de rutinas." : payload.error.message);
  }

  return assertApiSuccess(payload, "No se pudieron cargar las carpetas de rutinas.");
};

export const deleteRoutineFile = async (fetchImpl: typeof fetch, fileId: string): Promise<void> => {
  const response = await fetchImpl(`/api/routines/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const payload = await parseApiPayload<unknown>(response);

  if (!response.ok) {
    throw new Error(payload.success ? "No se pudo eliminar el archivo." : payload.error.message);
  }
};

export const buildRoutineDownloadUrl = (fileId: string) => `/api/routines/files/${encodeURIComponent(fileId)}/download`;

export const buildRoutinePreviewUrl = (fileId: string) => `/api/routines/files/${encodeURIComponent(fileId)}/preview`;

const ROUTINE_UPLOAD_ACCEPTED_EXTENSIONS = new Set(["pdf", "xls", "xlsx"]);

const getExtensionFromName = (fileName: string) => {
  const trimmed = fileName.trim();
  const lastDotIndex = trimmed.lastIndexOf(".");

  if (lastDotIndex <= 0 || lastDotIndex === trimmed.length - 1) {
    return null;
  }

  return trimmed.slice(lastDotIndex + 1).toLowerCase();
};

export const validateRoutineFileForUpload = (file: File): RoutineUploadValidationResult => {
  if (file.size <= 0) {
    return {
      ok: false,
      error: "El archivo no puede estar vacío.",
    };
  }

  const extension = getExtensionFromName(file.name);

  if (!extension || !ROUTINE_UPLOAD_ACCEPTED_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      error: "Tipo de archivo no soportado. Solo se permiten PDF, XLS y XLSX.",
    };
  }

  return { ok: true };
};

const normalizeUploadResponse = (payloadData: RoutineFile | RoutineFile[] | null | undefined): RoutineFile[] => {
  if (!payloadData) {
    return [];
  }

  return Array.isArray(payloadData) ? payloadData : [payloadData];
};

export const uploadRoutineFiles = async (
  fetchImpl: typeof fetch,
  folderId: string,
  files: File[]
): Promise<RoutineFile[]> => {
  if (files.length === 0) {
    throw new Error("Seleccioná al menos un archivo para subir.");
  }

  const validationErrors = files
    .map((file) => {
      const validation = validateRoutineFileForUpload(file);
      return validation.ok ? null : `${file.name}: ${validation.error}`;
    })
    .filter((value): value is string => value !== null);

  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join(" "));
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files[]", file);
  });

  const response = await fetchImpl(`/api/routines/folders/${encodeURIComponent(folderId)}/files`, {
    method: "POST",
    body: formData,
  });

  const payload = await parseApiPayload<RoutineFile | RoutineFile[]>(response);

  if (!response.ok) {
    throw new Error(payload.success ? "No se pudieron subir los archivos." : payload.error.message);
  }

  const uploaded = assertApiSuccess(payload, "No se pudieron subir los archivos.");
  return normalizeUploadResponse(uploaded);
};

export const fetchRoutinePreviewBinary = async (fetchImpl: typeof fetch, fileId: string): Promise<ArrayBuffer> => {
  const response = await fetchImpl(buildRoutinePreviewUrl(fileId), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await parseApiPayload<unknown>(response);
    throw new Error(payload.success ? "No se pudo cargar la previsualización del archivo." : payload.error.message);
  }

  return response.arrayBuffer();
};
