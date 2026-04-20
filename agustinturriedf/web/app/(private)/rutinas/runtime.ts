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

export type RoutineFolder = {
  id: string;
  studentProfileId: string;
  studentUserId: string;
  displayName: string;
  storageKey: string;
  files: RoutineFile[];
};

export type RoutinesViewData =
  | {
      role: "STUDENT";
      folder: RoutineFolder | null;
    }
  | {
      role: "STAFF";
      folders: RoutineFolder[];
    };

export type RoutineUiPermissions = {
  canUploadFiles: boolean;
  canDeleteFiles: boolean;
  canCreateFolders: boolean;
  canDeleteFolders: boolean;
};

const ALLOWED_EXTENSIONS = new Set<RoutineFileType>(["pdf", "xls", "xlsx"]);

export const DEFAULT_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

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

const getFileExtension = (fileName: string) => {
  const trimmed = fileName.trim();
  const extension = trimmed.includes(".") ? trimmed.split(".").pop()?.toLowerCase() : null;

  return extension ?? null;
};

export const validateRoutineUpload = (file: File, maxSizeBytes = DEFAULT_MAX_UPLOAD_BYTES): string | null => {
  const extension = getFileExtension(file.name);

  if (!extension || !ALLOWED_EXTENSIONS.has(extension as RoutineFileType)) {
    return "Tipo de archivo no soportado. Solo se permiten PDF, XLS y XLSX.";
  }

  if (file.size <= 0) {
    return "El archivo no puede estar vacío.";
  }

  if (file.size > maxSizeBytes) {
    return `El archivo supera el máximo permitido (${Math.round(maxSizeBytes / 1024 / 1024)} MB).`;
  }

  return null;
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

  const foldersPayload = await parseApiPayload<RoutineFolder[]>(foldersResponse);

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

export const fetchRoutineFolders = async (fetchImpl: typeof fetch): Promise<RoutineFolder[]> => {
  const response = await fetchImpl("/api/routines/folders", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const payload = await parseApiPayload<RoutineFolder[]>(response);

  if (!response.ok) {
    throw new Error(payload.success ? "No se pudieron cargar las carpetas de rutinas." : payload.error.message);
  }

  return assertApiSuccess(payload, "No se pudieron cargar las carpetas de rutinas.");
};

export const uploadRoutineFile = async (
  fetchImpl: typeof fetch,
  input: {
    folderId: string;
    file: File;
    observations?: string;
  }
): Promise<RoutineFile> => {
  const formData = new FormData();
  formData.append("file", input.file);

  const normalizedObservations = input.observations?.trim();
  if (normalizedObservations) {
    formData.append("observations", normalizedObservations);
  }

  const response = await fetchImpl(`/api/routines/folders/${encodeURIComponent(input.folderId)}/files`, {
    method: "POST",
    body: formData,
  });

  const payload = await parseApiPayload<RoutineFile>(response);

  if (!response.ok) {
    throw new Error(payload.success ? "No se pudo subir el archivo." : payload.error.message);
  }

  return assertApiSuccess(payload, "No se pudo subir el archivo.");
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
