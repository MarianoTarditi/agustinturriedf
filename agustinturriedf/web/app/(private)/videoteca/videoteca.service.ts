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
};

export type VideotecaFolder = {
  id: string;
  name: string;
  updatedAt: string;
  fileCount: number;
  tags: string[];
};

export type CreateFolderDraft = VideotecaFolder;

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
  files: VideotecaFile[];
};

export type UploadProgressInput = {
  loaded: number;
  total: number;
};

export const MOCK_VIDEOTECA_FOLDERS: VideotecaFolder[] = [
  {
    id: "folder-1",
    name: "RODILLA",
    updatedAt: "12 Oct 2023",
    fileCount: 14,
    tags: ["rodilla", "movilidad"],
  },
  {
    id: "folder-2",
    name: "May correa",
    updatedAt: "08 Oct 2023",
    fileCount: 2,
    tags: ["aad"],
  },
  {
    id: "folder-3",
    name: "Cadera",
    updatedAt: "25 Sep 2023",
    fileCount: 8,
    tags: ["cadera", "atleta"],
  },
  {
    id: "folder-4",
    name: "CORE & ESTABILIDAD",
    updatedAt: "14 Sep 2023",
    fileCount: 21,
    tags: ["core"],
  },
  {
    id: "folder-5",
    name: "Hombro",
    updatedAt: "02 Sep 2023",
    fileCount: 6,
    tags: ["articulación"],
  },
  {
    id: "folder-6",
    name: "Técnicas de Fuerza",
    updatedAt: "28 Ago 2023",
    fileCount: 32,
    tags: ["élite", "fuerza"],
  },
];

const mockVideotecaFolderById = new Map(
  MOCK_VIDEOTECA_FOLDERS.map((folder) => [folder.id, folder]),
);

const MOCK_VIDEOTECA_FILES_BY_FOLDER_ID: Record<
  string,
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
> = {
  "folder-1": [
    {
      id: "folder-1-file-1",
      folderId: "folder-1",
      name: "Evaluación inicial de rodilla",
      type: "video",
      duration: "05:28",
      updatedAt: "15 Oct 2023",
      sizeBytes: 48234496,
      orderIndex: 1,
    },
    {
      id: "folder-1-file-2",
      folderId: "folder-1",
      name: "Checklist de dolor patelofemoral",
      type: "image",
      duration: "—",
      updatedAt: "14 Oct 2023",
      sizeBytes: 1264512,
      orderIndex: 2,
    },
    {
      id: "folder-1-file-3",
      folderId: "folder-1",
      name: "Isometría de cuádriceps",
      type: "video",
      duration: "03:42",
      updatedAt: "13 Oct 2023",
      sizeBytes: 35913728,
      orderIndex: 3,
    },
    {
      id: "folder-1-file-4",
      folderId: "folder-1",
      name: "Progresión en split squat",
      type: "video",
      duration: "06:11",
      updatedAt: "12 Oct 2023",
      sizeBytes: 58150912,
      orderIndex: 4,
    },
    {
      id: "folder-1-file-5",
      folderId: "folder-1",
      name: "Guía visual de alineación",
      type: "image",
      duration: "—",
      updatedAt: "11 Oct 2023",
      sizeBytes: 1982464,
      orderIndex: 5,
    },
  ],
  "folder-2": [
    {
      id: "folder-2-file-1",
      folderId: "folder-2",
      name: "May Correa - rutina diaria",
      type: "video",
      duration: "02:58",
      updatedAt: "08 Oct 2023",
      sizeBytes: 28432128,
      orderIndex: 1,
    },
    {
      id: "folder-2-file-2",
      folderId: "folder-2",
      name: "Foto control semana 4",
      type: "image",
      duration: "—",
      updatedAt: "08 Oct 2023",
      sizeBytes: 1679360,
      orderIndex: 2,
    },
    {
      id: "folder-2-file-3",
      folderId: "folder-2",
      name: "Movilidad previa al trote",
      type: "video",
      duration: "01:49",
      updatedAt: "07 Oct 2023",
      sizeBytes: 18109440,
      orderIndex: 3,
    },
  ],
  "folder-3": [
    {
      id: "folder-3-file-1",
      folderId: "folder-3",
      name: "Control lumbo-pélvico",
      type: "video",
      duration: "04:36",
      updatedAt: "25 Sep 2023",
      sizeBytes: 42642432,
      orderIndex: 1,
    },
    {
      id: "folder-3-file-2",
      folderId: "folder-3",
      name: "Referencia de bisagra de cadera",
      type: "image",
      duration: "—",
      updatedAt: "24 Sep 2023",
      sizeBytes: 1436672,
      orderIndex: 2,
    },
    {
      id: "folder-3-file-3",
      folderId: "folder-3",
      name: "Step-up unilateral",
      type: "video",
      duration: "03:15",
      updatedAt: "23 Sep 2023",
      sizeBytes: 33423360,
      orderIndex: 3,
    },
    {
      id: "folder-3-file-4",
      folderId: "folder-3",
      name: "Respiración 90-90",
      type: "video",
      duration: "02:24",
      updatedAt: "22 Sep 2023",
      sizeBytes: 25165824,
      orderIndex: 4,
    },
  ],
  "folder-4": [
    {
      id: "folder-4-file-1",
      folderId: "folder-4",
      name: "Circuito anti-rotación",
      type: "video",
      duration: "07:03",
      updatedAt: "14 Sep 2023",
      sizeBytes: 65273856,
      orderIndex: 1,
    },
    {
      id: "folder-4-file-2",
      folderId: "folder-4",
      name: "Plancha lateral - puntos clave",
      type: "image",
      duration: "—",
      updatedAt: "13 Sep 2023",
      sizeBytes: 1155072,
      orderIndex: 2,
    },
    {
      id: "folder-4-file-3",
      folderId: "folder-4",
      name: "Dead bug con banda",
      type: "video",
      duration: "03:34",
      updatedAt: "12 Sep 2023",
      sizeBytes: 38830080,
      orderIndex: 3,
    },
    {
      id: "folder-4-file-4",
      folderId: "folder-4",
      name: "Pallof press en rodillas",
      type: "video",
      duration: "02:57",
      updatedAt: "11 Sep 2023",
      sizeBytes: 30408704,
      orderIndex: 4,
    },
    {
      id: "folder-4-file-5",
      folderId: "folder-4",
      name: "Secuencia de activación core",
      type: "image",
      duration: "—",
      updatedAt: "10 Sep 2023",
      sizeBytes: 1732608,
      orderIndex: 5,
    },
  ],
  "folder-5": [
    {
      id: "folder-5-file-1",
      folderId: "folder-5",
      name: "Movilidad escapular asistida",
      type: "video",
      duration: "04:02",
      updatedAt: "02 Sep 2023",
      sizeBytes: 36700160,
      orderIndex: 1,
    },
    {
      id: "folder-5-file-2",
      folderId: "folder-5",
      name: "Control de manguito rotador",
      type: "video",
      duration: "05:10",
      updatedAt: "01 Sep 2023",
      sizeBytes: 47185920,
      orderIndex: 2,
    },
    {
      id: "folder-5-file-3",
      folderId: "folder-5",
      name: "Diagrama de elevación segura",
      type: "image",
      duration: "—",
      updatedAt: "31 Ago 2023",
      sizeBytes: 1540096,
      orderIndex: 3,
    },
  ],
  "folder-6": [
    {
      id: "folder-6-file-1",
      folderId: "folder-6",
      name: "Técnica de sentadilla frontal",
      type: "video",
      duration: "08:12",
      updatedAt: "28 Ago 2023",
      sizeBytes: 77594624,
      orderIndex: 1,
    },
    {
      id: "folder-6-file-2",
      folderId: "folder-6",
      name: "Checklist de brace abdominal",
      type: "image",
      duration: "—",
      updatedAt: "27 Ago 2023",
      sizeBytes: 1015808,
      orderIndex: 2,
    },
    {
      id: "folder-6-file-3",
      folderId: "folder-6",
      name: "Peso muerto - cues principales",
      type: "video",
      duration: "06:48",
      updatedAt: "26 Ago 2023",
      sizeBytes: 62914560,
      orderIndex: 3,
    },
    {
      id: "folder-6-file-4",
      folderId: "folder-6",
      name: "Empuje de trineo - ejecución",
      type: "video",
      duration: "02:39",
      updatedAt: "25 Ago 2023",
      sizeBytes: 27262976,
      orderIndex: 4,
    },
    {
      id: "folder-6-file-5",
      folderId: "folder-6",
      name: "Referencia visual de agarres",
      type: "image",
      duration: "—",
      updatedAt: "24 Ago 2023",
      sizeBytes: 1863680,
      orderIndex: 5,
    },
    {
      id: "folder-6-file-6",
      folderId: "folder-6",
      name: "Saltos pliométricos - progresión",
      type: "video",
      duration: "03:21",
      updatedAt: "23 Ago 2023",
      sizeBytes: 34603008,
      orderIndex: 6,
    },
  ],
};

const buildMockVideotecaFolderDetail = (folderId: string): VideotecaFolderDetail | null => {
  const folder = mockVideotecaFolderById.get(folderId);

  if (!folder) {
    return null;
  }

  const mockFiles = MOCK_VIDEOTECA_FILES_BY_FOLDER_ID[folderId] ?? [];

  return {
    ...folder,
    fileCount: mockFiles.length,
    files: mockFiles.map(mapApiFileToVideotecaFile),
  };
};

const shouldUseMockFolderFallback = (folderId: string, status: number) => {
  if (!mockVideotecaFolderById.has(folderId)) {
    return false;
  }

  if (status === 404) {
    return true;
  }

  return status >= 500;
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
  let response: Response;

  try {
    response = await fetchImpl(`/api/videoteca/folders/${encodeURIComponent(folderId)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  } catch (error) {
    const fallback = buildMockVideotecaFolderDetail(folderId);

    if (!fallback) {
      throw error;
    }

    return fallback;
  }

  const payload = await parseApiPayload<{
    id: string;
    name: string;
    updatedAt: string;
    fileCount: number;
    tags: string[];
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
    const fallback = shouldUseMockFolderFallback(folderId, response.status)
      ? buildMockVideotecaFolderDetail(folderId)
      : null;

    if (fallback) {
      return fallback;
    }

    throw new Error(payload.success ? "No se pudo cargar la carpeta seleccionada." : payload.error.message);
  }

  const folder = assertApiSuccess(payload, "No se pudo cargar la carpeta seleccionada.");

  return {
    ...folder,
    files: folder.files.map(mapApiFileToVideotecaFile),
  };
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

export function buildFolderDraft(input: CreateFolderInput): CreateFolderDraft | null {
  const name = normalizeFolderName(input.name);

  if (!name) return null;

  return {
    id: `folder-${Date.now()}`,
    name,
    updatedAt: new Date().toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    fileCount: 0,
    tags: [],
  };
}
