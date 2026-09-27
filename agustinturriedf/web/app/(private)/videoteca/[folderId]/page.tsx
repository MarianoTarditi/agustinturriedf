"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import styles from "@/app/(private)/videoteca/[folderId]/folder-detail.module.css";
import { useLoading } from "@/components/use-loading";
import {
  createVideotecaFolder,
  deleteVideotecaFolder,
  deleteVideotecaFile,
  downloadVideotecaFile,
  fetchVideotecaFolderDetail,
  formatVideotecaSize,
  normalizeFolderName,
  renameVideotecaFolder,
  renameVideotecaFile,
  uploadVideotecaFile,
  type VideotecaFile,
  type VideotecaFolder,
  type VideotecaFolderDetail,
  validateVideotecaFileForUpload,
} from "@/app/(private)/videoteca/videoteca.service";
import { DestructiveConfirmationModal } from "@/components/destructive-confirmation-modal";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";
import { useToast } from "@/components/use-toast";

function getFileVisual(type: VideotecaFile["type"]) {
  if (type === "image") {
    return {
      icon: "image",
      label: "Imagen",
      cardTone: "image" as const,
    };
  }

  return {
    icon: "movie",
    label: "Video",
    cardTone: "video" as const,
  };
}

function inferMediaTypeFromFile(file: File): VideotecaFile["type"] {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  return "video";
}

export default function VideotecaFolderPage() {
  const router = useRouter();
  const routeParams = useParams<{ folderId: string }>();
  const { showLoader, hideLoader, updateProgress } = useLoading();
  const { showToast } = useToast();
  const folderId = routeParams?.folderId ?? "";
  const [folder, setFolder] = useState<VideotecaFolderDetail | null>(null);
  const [childFolders, setChildFolders] = useState<VideotecaFolder[]>([]);
  const [files, setFiles] = useState<VideotecaFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [fileContextMenu, setFileContextMenu] = useState<{
    fileId: string;
    x: number;
    y: number;
  } | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [draftFileName, setDraftFileName] = useState("");
  const [activeDeleteFileId, setActiveDeleteFileId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isRenamingFile, setIsRenamingFile] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [folderContextMenu, setFolderContextMenu] = useState<{
    folderId: string;
    x: number;
    y: number;
  } | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [draftFolderName, setDraftFolderName] = useState("");
  const [activeDeleteFolderId, setActiveDeleteFolderId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isRenamingFolder, setIsRenamingFolder] = useState(false);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  const [overallUploadProgress, setOverallUploadProgress] = useState(0);
  const [queuedUploads, setQueuedUploads] = useState<
    Array<{
      id: string;
      file: File;
      type: VideotecaFile["type"];
      sizeLabel: string;
      previewUrl: string | null;
      status: "queued" | "uploading" | "uploaded" | "error";
      progress: number;
      uploadedBytes: number;
      errorMessage: string | null;
    }>
  >([]);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"recientes" | "az">("recientes");

  const editingFile = useMemo(
    () =>
      editingFileId
        ? files.find((file) => file.id === editingFileId) ?? null
        : null,
    [editingFileId, files],
  );

  const activeDeleteFile = useMemo(
    () =>
      activeDeleteFileId
        ? files.find((file) => file.id === activeDeleteFileId) ?? null
        : null,
    [activeDeleteFileId, files],
  );

  const activeContextMenuFile = useMemo(
    () =>
      fileContextMenu
        ? files.find((file) => file.id === fileContextMenu.fileId) ?? null
        : null,
    [files, fileContextMenu],
  );

  const editingFolder = useMemo(
    () =>
      editingFolderId
        ? childFolders.find((subfolder) => subfolder.id === editingFolderId) ?? null
        : null,
    [childFolders, editingFolderId],
  );

  const activeDeleteFolder = useMemo(
    () =>
      activeDeleteFolderId
        ? childFolders.find((subfolder) => subfolder.id === activeDeleteFolderId) ?? null
        : null,
    [activeDeleteFolderId, childFolders],
  );

  const activeContextMenuFolder = useMemo(
    () =>
      folderContextMenu
        ? childFolders.find((subfolder) => subfolder.id === folderContextMenu.folderId) ?? null
        : null,
    [childFolders, folderContextMenu],
  );

  const isNotFoundError =
    loadingError?.toLocaleLowerCase("es-AR").includes("no encontrada") ?? false;

  const filteredAndSortedFolders = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase("es-AR");
    const base = q ? childFolders.filter((f) => f.name.toLocaleLowerCase("es-AR").includes(q)) : childFolders;

    if (sortOrder === "az") {
      return [...base].sort((a, b) => a.name.localeCompare(b.name, "es-AR"));
    }
    return [...base].sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime() || 0;
      const dateB = new Date(b.updatedAt).getTime() || 0;
      return dateB - dateA;
    });
  }, [childFolders, searchQuery, sortOrder]);

  const filteredAndSortedFiles = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase("es-AR");
    let result = q ? files.filter((f) => f.name.toLocaleLowerCase("es-AR").includes(q)) : files;

    if (sortOrder === "az") {
      result = result.sort((a, b) => a.name.localeCompare(b.name, "es-AR"));
    } else {
      result = result.sort((a, b) => {
        const dateA = new Date(a.updatedAt).getTime() || 0;
        const dateB = new Date(b.updatedAt).getTime() || 0;
        return dateB - dateA;
      });
    }
    return result;
  }, [files, searchQuery, sortOrder]);

  function closeFileContextMenu() {
    setFileContextMenu(null);
  }

  function getSafeMenuPosition(x: number, y: number) {
    const MENU_WIDTH = 184;
    const MENU_HEIGHT = 152;
    const EDGE_OFFSET = 12;

    const maxX = Math.max(
      EDGE_OFFSET,
      window.innerWidth - MENU_WIDTH - EDGE_OFFSET,
    );
    const maxY = Math.max(
      EDGE_OFFSET,
      window.innerHeight - MENU_HEIGHT - EDGE_OFFSET,
    );

    return {
      x: Math.min(Math.max(EDGE_OFFSET, x), maxX),
      y: Math.min(Math.max(EDGE_OFFSET, y), maxY),
    };
  }

  function openFileContextMenu(fileId: string, x: number, y: number) {
    const safePosition = getSafeMenuPosition(x, y);

    setFileContextMenu({
      fileId,
      x: safePosition.x,
      y: safePosition.y,
    });
  }

  function closeFolderContextMenu() {
    setFolderContextMenu(null);
  }

  function openFolderContextMenu(folderEntryId: string, x: number, y: number) {
    const safePosition = getSafeMenuPosition(x, y);

    setFolderContextMenu({
      folderId: folderEntryId,
      x: safePosition.x,
      y: safePosition.y,
    });
  }

  function handleFolderMenuButtonClick(
    event: React.MouseEvent<HTMLButtonElement>,
    folderEntry: VideotecaFolder,
  ) {
    event.stopPropagation();

    if (folderContextMenu?.folderId === folderEntry.id) {
      closeFolderContextMenu();
      return;
    }

    const triggerRect = event.currentTarget.getBoundingClientRect();
    openFolderContextMenu(folderEntry.id, triggerRect.right - 6, triggerRect.bottom + 8);
  }

  function handleFileMenuButtonClick(
    event: React.MouseEvent<HTMLButtonElement>,
    file: VideotecaFile,
  ) {
    event.stopPropagation();

    if (fileContextMenu?.fileId === file.id) {
      closeFileContextMenu();
      return;
    }

    const triggerRect = event.currentTarget.getBoundingClientRect();
    openFileContextMenu(file.id, triggerRect.right - 6, triggerRect.bottom + 8);
  }

  useEffect(() => {
    if (!folderId) return;

    let cancelled = false;

    showLoader("videoteca-folder-contents-load", { text: "Cargando contenido..." });

    const loadFolder = async () => {
      try {
        setIsLoading(true);
        setLoadingError(null);
        const detail = await fetchVideotecaFolderDetail(fetch, folderId);
        if (cancelled) return;

        setFolder(detail);
        setChildFolders(detail.childFolders);
        setFiles(detail.files);
      } catch (error) {
        if (cancelled) return;
        setFolder(null);
        setChildFolders([]);
        setFiles([]);
        setLoadingError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la carpeta de videoteca.",
        );
      } finally {
        if (!cancelled) {
          hideLoader("videoteca-folder-contents-load");
          setIsLoading(false);
        }
      }
    };

    void loadFolder();

    setSelectedFileIds([]);
    setFileContextMenu(null);
    setEditingFileId(null);
    setDraftFileName("");
    setActiveDeleteFileId(null);
    setFolderContextMenu(null);
    setEditingFolderId(null);
    setDraftFolderName("");
    setActiveDeleteFolderId(null);
    setIsCreateModalOpen(false);
    setNewFolderName("");
    setQueuedUploads([]);
    setOverallUploadProgress(0);

    return () => {
      cancelled = true;
    };
  }, [folderId]);

  useEffect(() => {
    setSelectedFileIds((prevSelectedIds) =>
      prevSelectedIds.filter((selectedId) => files.some((file) => file.id === selectedId)),
    );
  }, [files]);

  useEffect(() => {
    return () => {
      queuedUploads.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, [queuedUploads]);

  useEffect(() => {
    if (!fileContextMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('[data-file-context-menu="true"]')) return;
      if (target.closest('[data-file-menu-trigger="true"]')) return;

      closeFileContextMenu();
    };

    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-file-card="true"]')) return;

      closeFileContextMenu();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFileContextMenu();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [fileContextMenu]);

  useEffect(() => {
    if (!fileContextMenu) return;

    const exists = files.some((file) => file.id === fileContextMenu.fileId);
    if (!exists) {
      closeFileContextMenu();
    }
  }, [files, fileContextMenu]);

  useEffect(() => {
    if (!folderContextMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('[data-folder-context-menu="true"]')) return;
      if (target.closest('[data-folder-menu-trigger="true"]')) return;

      closeFolderContextMenu();
    };

    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-folder-card="true"]')) return;

      closeFolderContextMenu();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFolderContextMenu();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [folderContextMenu]);

  useEffect(() => {
    if (!folderContextMenu) return;

    const exists = childFolders.some((subfolder) => subfolder.id === folderContextMenu.folderId);
    if (!exists) {
      closeFolderContextMenu();
    }
  }, [childFolders, folderContextMenu]);

  const selectedCount = selectedFileIds.length;
  const allSelected = files.length > 0 && selectedCount === files.length;
  const hasParent = Boolean(folder?.parent);
  const parentNavigation = folder?.parent
    ? {
        href: `/videoteca/${folder.parent.id}`,
        label: `Volver a ${folder.parent.name}`,
      }
    : null;

  const breadcrumbAncestors = folder?.breadcrumb ?? [];

  function toggleFileSelection(fileId: string) {
    setSelectedFileIds((prevSelectedIds) => {
      if (prevSelectedIds.includes(fileId)) {
        return prevSelectedIds.filter((selectedId) => selectedId !== fileId);
      }

      return [...prevSelectedIds, fileId];
    });
  }

  function clearSelection() {
    setSelectedFileIds([]);
  }

  function toggleSelectAll() {
    if (allSelected) {
      clearSelection();
      return;
    }

    setSelectedFileIds(files.map((file) => file.id));
  }

  function openRenameModal(file: VideotecaFile) {
    setActionError(null);
    setDraftFileName(file.name);
    setEditingFileId(file.id);
    closeFileContextMenu();
  }

  function closeRenameModal() {
    if (isRenamingFile) return;

    setEditingFileId(null);
    setDraftFileName("");
    setActionError(null);
  }

  async function handleConfirmRename() {
    const nextName = draftFileName.trim().replace(/\s+/g, " ");

    if (!editingFileId || !nextName || isRenamingFile) return;

    try {
      setActionError(null);

      showLoader("videoteca-file-rename", { text: "Renombrando archivo..." });
      const renamedFile = await renameVideotecaFile(fetch, editingFileId, { name: nextName });

      setFiles((currentFiles) =>
        currentFiles.map((file) => (file.id === editingFileId ? renamedFile : file)),
      );

      setFolder((currentFolder) =>
        currentFolder
          ? {
              ...currentFolder,
              updatedAt: renamedFile.updatedAt,
            }
          : currentFolder,
      );

      setEditingFileId(null);
      setDraftFileName("");
      setActionError(null);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : "No se pudo renombrar el archivo.");
    } finally {
      hideLoader("videoteca-file-rename");
      setIsRenamingFile(false);
    }
  }

  function openDeleteModal(file: VideotecaFile) {
    setActionError(null);
    setActiveDeleteFileId(file.id);
    closeFileContextMenu();
  }

  function closeDeleteModal() {
    if (isDeletingFile) return;

    setActiveDeleteFileId(null);
    setActionError(null);
  }

  async function handleConfirmDelete() {
    if (!activeDeleteFileId || isDeletingFile) return;

    try {
      setActionError(null);

      showLoader("videoteca-file-delete", { text: "Eliminando archivo..." });
      const deletedFile = await deleteVideotecaFile(fetch, activeDeleteFileId);

      setFiles((currentFiles) => currentFiles.filter((file) => file.id !== activeDeleteFileId));
      setSelectedFileIds((currentSelectedIds) =>
        currentSelectedIds.filter((fileId) => fileId !== activeDeleteFileId),
      );
      setFolder((currentFolder) =>
        currentFolder
          ? {
              ...currentFolder,
              fileCount: Math.max(0, currentFolder.fileCount - 1),
              updatedAt: deletedFile.updatedAt,
            }
          : currentFolder,
      );

      setActiveDeleteFileId(null);
      setActionError(null);
      showToast('success', 'Archivo eliminado correctamente.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudo eliminar el archivo.");
    } finally {
      hideLoader("videoteca-file-delete");
      setIsDeletingFile(false);
    }
  }

  async function handleDownload(file: VideotecaFile) {
    closeFileContextMenu();

    try {
      setActionError(null);
      setDownloadingFileId(file.id);
      await downloadVideotecaFile(fetch, file);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : "No se pudo descargar el archivo.");
    } finally {
      setDownloadingFileId(null);
    }
  }

  function openFolder(folderEntryId: string) {
    router.push(`/videoteca/${folderEntryId}`);
  }

  function shouldIgnoreSubfolderCardNavigation(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      target.closest(
        'button, a, input, select, textarea, label, [role="menu"], [role="menuitem"]',
      ),
    );
  }

  function handleSubfolderCardClick(
    event: React.MouseEvent<HTMLElement>,
    folderEntryId: string,
  ) {
    if (shouldIgnoreSubfolderCardNavigation(event.target)) {
      return;
    }

    openFolder(folderEntryId);
  }

  function handleSubfolderCardKeyDown(
    event: React.KeyboardEvent<HTMLElement>,
    folderEntryId: string,
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    if (shouldIgnoreSubfolderCardNavigation(event.target)) {
      return;
    }

    event.preventDefault();
    openFolder(folderEntryId);
  }

  function openCreateModal() {
    
    setIsCreateModalOpen(true);
    setNewFolderName("");
  }

  function closeCreateModal(force = false) {
    if (isCreatingFolder && !force) return;

    setIsCreateModalOpen(false);
    setNewFolderName("");
    
  }

  async function handleConfirmCreateFolder() {
    if (!folder) return;

    const folderName = normalizeFolderName(newFolderName);
    if (!folderName || isCreatingFolder) return;

    try {
      

      showLoader("videoteca-subfolder-create", { text: "Creando subcarpeta..." });
      const createdFolder = await createVideotecaFolder(fetch, {
        name: folderName,
        parentId: folder.id,
      });

      setChildFolders((currentFolders) => [createdFolder, ...currentFolders]);
      showToast('success', 'Subcarpeta creada correctamente.');
      closeCreateModal(true);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : "No se pudo crear la carpeta.");
    } finally {
      hideLoader("videoteca-subfolder-create");
      setIsCreatingFolder(false);
    }
  }

  function openRenameFolderModal(folderEntry: VideotecaFolder) {
    
    setEditingFolderId(folderEntry.id);
    setDraftFolderName(folderEntry.name);
    closeFolderContextMenu();
  }

  function closeRenameFolderModal(force = false) {
    if (isRenamingFolder && !force) return;

    setEditingFolderId(null);
    setDraftFolderName("");
    
  }

  async function handleConfirmRenameFolder() {
    const nextName = normalizeFolderName(draftFolderName);

    if (!editingFolderId || !nextName || isRenamingFolder) return;

    try {
      

      showLoader("videoteca-subfolder-rename", { text: "Guardando cambios..." });
      const renamedFolder = await renameVideotecaFolder(fetch, editingFolderId, {
        name: nextName,
      });

      setChildFolders((currentFolders) =>
        currentFolders.map((subfolder) => (subfolder.id === editingFolderId ? renamedFolder : subfolder)),
      );
      showToast('success', 'Subcarpeta renombrada correctamente.');
      closeRenameFolderModal(true);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : "No se pudo editar la carpeta.");
    } finally {
      hideLoader("videoteca-subfolder-rename");
      setIsRenamingFolder(false);
    }
  }

  function openDeleteFolderModal(folderEntry: VideotecaFolder) {
    
    setActiveDeleteFolderId(folderEntry.id);
    closeFolderContextMenu();
  }

  function closeDeleteFolderModal(force = false) {
    if (isDeletingFolder && !force) return;

    setActiveDeleteFolderId(null);
    
  }

  async function handleConfirmDeleteFolder() {
    if (!activeDeleteFolderId || isDeletingFolder) return;

    try {
      

      showLoader("videoteca-subfolder-delete", { text: "Eliminando subcarpeta..." });
      await deleteVideotecaFolder(fetch, activeDeleteFolderId);

      setChildFolders((currentFolders) =>
        currentFolders.filter((subfolder) => subfolder.id !== activeDeleteFolderId),
      );
      showToast('success', 'Subcarpeta eliminada correctamente.');
      closeDeleteFolderModal(true);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : "No se pudo eliminar la carpeta.");
    } finally {
      hideLoader("videoteca-subfolder-delete");
      setIsDeletingFolder(false);
    }
  }

  function handleUploadButtonClick() {
    uploadInputRef.current?.click();
  }

  function removeQueuedUpload(uploadId: string) {
    if (isUploadingBatch) return;

    setQueuedUploads((current) => {
      const target = current.find((item) => item.id === uploadId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((item) => item.id !== uploadId);
    });
  }

  function handleUploadInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = event.currentTarget.files;

    if (!selectedFiles || selectedFiles.length === 0) return;

    const acceptedEntries: Array<{
      id: string;
      file: File;
      type: VideotecaFile["type"];
      sizeLabel: string;
      previewUrl: string | null;
      status: "queued";
      progress: number;
      uploadedBytes: number;
      errorMessage: null;
    }> = [];

    const rejectedMessages: string[] = [];

    Array.from(selectedFiles).forEach((file) => {
      const validation = validateVideotecaFileForUpload(file);

      if (!validation.ok) {
        rejectedMessages.push(`${file.name}: ${validation.error}`);
        return;
      }

      const type = inferMediaTypeFromFile(file);

      acceptedEntries.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        type,
        sizeLabel: formatVideotecaSize(file.size),
        previewUrl: type === "image" ? URL.createObjectURL(file) : null,
        status: "queued",
        progress: 0,
        uploadedBytes: 0,
        errorMessage: null,
      });
    });

    if (acceptedEntries.length > 0) {
      setQueuedUploads((current) => [...current, ...acceptedEntries]);
      showToast('success', `${acceptedEntries.length} archivo${acceptedEntries.length === 1 ? "" : "s"} listo${acceptedEntries.length === 1 ? "" : "s"} para subir.`);
    }

    if (rejectedMessages.length > 0) {
      showToast('error', rejectedMessages.join(" "));
    }

    event.currentTarget.value = "";
  }

  async function handleUploadBatch() {
    if (!folder || queuedUploads.length === 0 || isUploadingBatch) return;

    setIsUploadingBatch(true);
    
    setOverallUploadProgress(0);

    showLoader('videoteca-upload', { text: 'Subiendo archivos...' });

    try {
      const initialUploadIds = queuedUploads.map((item) => item.id);
      const totalBytes = queuedUploads.reduce((sum, item) => sum + item.file.size, 0);
      let uploadedBytesBeforeCurrent = 0;
      const uploadedFilesBatch: VideotecaFile[] = [];
      const failedFiles: string[] = [];

      for (const queuedItem of queuedUploads) {
        setQueuedUploads((current) =>
          current.map((item) =>
            item.id === queuedItem.id
              ? { ...item, status: "uploading", progress: 0, uploadedBytes: 0, errorMessage: null }
              : item,
          ),
        );

        try {
          const uploadedFile = await uploadVideotecaFile(folder.id, queuedItem.file, {
            onProgress: ({ loaded, total }) => {
              const safeTotal = total > 0 ? total : queuedItem.file.size;
              const safeLoaded = Math.min(loaded, safeTotal);
              const progress = safeTotal > 0 ? Math.round((safeLoaded / safeTotal) * 100) : 0;

              setQueuedUploads((current) =>
                current.map((item) =>
                  item.id === queuedItem.id
                    ? { ...item, uploadedBytes: safeLoaded, progress }
                    : item,
                ),
              );

              const overall =
                totalBytes > 0
                  ? Math.min(100, Math.round(((uploadedBytesBeforeCurrent + safeLoaded) / totalBytes) * 100))
                  : 0;

              setOverallUploadProgress(overall);
              updateProgress('videoteca-upload', overall);
            },
          });

          uploadedBytesBeforeCurrent += queuedItem.file.size;
          uploadedFilesBatch.push(uploadedFile);

          setQueuedUploads((current) =>
            current.map((item) =>
              item.id === queuedItem.id
                ? {
                    ...item,
                    status: "uploaded",
                    progress: 100,
                    uploadedBytes: queuedItem.file.size,
                  }
                : item,
            ),
          );
        } catch (error) {
          failedFiles.push(queuedItem.file.name);

          setQueuedUploads((current) =>
            current.map((item) =>
              item.id === queuedItem.id
                ? {
                    ...item,
                    status: "error",
                    errorMessage:
                      error instanceof Error ? error.message : "No se pudo subir el archivo.",
                  }
                : item,
            ),
          );
        }
      }

      if (uploadedFilesBatch.length > 0) {
        setFiles((currentFiles) => [...currentFiles, ...uploadedFilesBatch]);
        setFolder((currentFolder) =>
          currentFolder
            ? {
                ...currentFolder,
                fileCount: currentFolder.fileCount + uploadedFilesBatch.length,
                updatedAt: new Date().toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }),
              }
            : currentFolder,
        );
      }

      setQueuedUploads((current) => {
        current.forEach((item) => {
          if (initialUploadIds.includes(item.id) && item.status !== "error" && item.previewUrl) {
            URL.revokeObjectURL(item.previewUrl);
          }
        });

        return current.filter((item) => !initialUploadIds.includes(item.id) || item.status === "error");
      });

      setOverallUploadProgress(100);
      updateProgress('videoteca-upload', 100);

      if (failedFiles.length > 0) {
        showToast('error', `No se pudieron subir ${failedFiles.length} archivos.`);
      }

      if (uploadedFilesBatch.length > 0) {
        showToast('success', `${uploadedFilesBatch.length} archivo${uploadedFilesBatch.length === 1 ? "" : "s"} subido${uploadedFilesBatch.length === 1 ? "" : "s"} correctamente.`);
      }
    } finally {
      hideLoader('videoteca-upload');
      setIsUploadingBatch(false);
    }
  }

  if (isLoading && !folder) {
    return (
      <section className={styles.page}>
        <PrivateBreadcrumb current="Detalle de carpeta" root={{ label: "Videoteca", href: "/videoteca" }} />
        <PrivateTopbar title="Cargando carpeta" subtitle="Estamos trayendo el contenido de videoteca." />

        <div className={styles.content}>
          <article className={styles.folderCard}>
            <div className={styles.cardBody}>
              <h3>Cargando...</h3>
              <p className={styles.cardMeta}>Esperá un momento mientras traemos la información.</p>
            </div>
          </article>
        </div>

        <div className={styles.localGlowPrimary} aria-hidden="true" />
        <div className={styles.localGlowSecondary} aria-hidden="true" />
      </section>
    );
  }

  if (!folder && !isLoading) {
    return (
      <section className={styles.page}>
        <PrivateBreadcrumb current="Carpeta no encontrada" root={{ label: "Videoteca", href: "/videoteca" }} />
        <PrivateTopbar
          title={isNotFoundError ? "Carpeta no encontrada" : "No se pudo cargar la carpeta"}
          subtitle={
            isNotFoundError
              ? "No encontramos la carpeta solicitada dentro de Videoteca."
              : "Hubo un problema al traer el detalle de esta carpeta de Videoteca."
          }
        />

        <div className={styles.content}>
          <article className={styles.folderCard}>
            <div className={styles.cardBody}>
              <h3>
                {isNotFoundError
                  ? "La carpeta no existe o fue eliminada."
                  : "Ocurrió un error al cargar la carpeta."}
              </h3>
              <p className={styles.cardMeta}>{loadingError ?? "Volvé a la vista principal para elegir otra carpeta."}</p>
            </div>

            <Link href="/videoteca" className={styles.folderEntryLink}>
              Volver a Videoteca
              <MaterialSymbol
                name="arrow_back"
                className={styles.folderEntryLinkIcon}
                weight={500}
                opticalSize={18}
              />
            </Link>
          </article>
        </div>

        <div className={styles.localGlowPrimary} aria-hidden="true" />
        <div className={styles.localGlowSecondary} aria-hidden="true" />
      </section>
    );
  }

  if (!folder) {
    return null;
  }

  return (
    <section className={styles.page}>
      <PrivateBreadcrumb
        current={folder.name}
        root={{ label: "Videoteca", href: "/videoteca" }}
        ancestors={breadcrumbAncestors.map((a) => ({
          id: a.id,
          name: a.name,
          href: `/videoteca/${a.id}`,
        }))}
      />
      <PrivateTopbar
        title={folder.name}
        subtitle="Explorá y administrá los archivos de esta carpeta sin salir del flujo de Videoteca."
      />

      <div className={styles.content}>
        <section className={styles.controlsRow}>
          <div className={styles.controlsMain}>
            {hasParent && parentNavigation ? (
              <>
                <Link href={parentNavigation.href} className={styles.filterButton}>
                  <MaterialSymbol
                    name="arrow_back"
                    className={styles.filterIcon}
                    weight={500}
                    opticalSize={18}
                  />
                  {parentNavigation.label}
                </Link>
                <Link href="/videoteca" className={styles.filterButton}>
                  <MaterialSymbol
                    name="video_library"
                    className={styles.filterIcon}
                    weight={500}
                    opticalSize={18}
                  />
                  Volver a videoteca
                </Link>
              </>
            ) : (
              <Link href="/videoteca" className={styles.filterButton}>
                <MaterialSymbol
                  name="arrow_back"
                  className={styles.filterIcon}
                  weight={500}
                  opticalSize={18}
                />
                Volver a videoteca
              </Link>
            )}
          </div>

          <div className={styles.controlsActions}>
            <button
              type="button"
              className={styles.createFolderButton}
              onClick={openCreateModal}
              disabled={isCreatingFolder}
            >
              <MaterialSymbol
                name="create_new_folder"
                className={styles.createFolderIcon}
                fill={1}
                weight={500}
                opticalSize={20}
              />
              <span>{isCreatingFolder ? "Creando..." : "Crear carpeta"}</span>
            </button>

            <button
              type="button"
              className={styles.uploadButton}
              onClick={handleUploadButtonClick}
              disabled={isUploadingBatch}
            >
              <MaterialSymbol
                name={isUploadingBatch ? "progress_activity" : "upload_file"}
                className={`${styles.uploadButtonIcon} ${isUploadingBatch ? styles.uploadButtonIconLoading : ""}`}
                fill={1}
                weight={500}
                opticalSize={20}
              />
              <span>{isUploadingBatch ? "Subiendo..." : "Subir archivo"}</span>
            </button>

            <input
              ref={uploadInputRef}
              type="file"
              className={styles.uploadInput}
              accept="image/*,video/*"
              multiple
              onChange={handleUploadInputChange}
              aria-label="Seleccionar imágenes o videos para subir"
            />
          </div>
        </section>

        

        {queuedUploads.length > 0 ? (
          <article className={`${styles.folderCard} ${styles.uploadQueueCard}`}>
            <header className={styles.uploadQueueHeader}>
              <div>
                <h3>Cola de subida</h3>
                <p>
                  {queuedUploads.length} archivo{queuedUploads.length === 1 ? "" : "s"} listo
                  {queuedUploads.length === 1 ? "" : "s"} para enviar.
                </p>
              </div>

              <button
                type="button"
                className={styles.uploadButton}
                onClick={handleUploadBatch}
                disabled={isUploadingBatch || queuedUploads.length === 0}
              >
                <MaterialSymbol
                  name={isUploadingBatch ? "progress_activity" : "cloud_upload"}
                  className={`${styles.uploadButtonIcon} ${isUploadingBatch ? styles.uploadButtonIconLoading : ""}`}
                  fill={1}
                  weight={500}
                  opticalSize={20}
                />
                <span>{isUploadingBatch ? "Subiendo..." : "Subir"}</span>
              </button>
            </header>

            <div className={styles.overallProgressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={overallUploadProgress}>
              <div className={styles.overallProgressFill} style={{ width: `${overallUploadProgress}%` }} />
            </div>

            <div className={styles.uploadQueueList}>
              {queuedUploads.map((item) => {
                const visual = getFileVisual(item.type);

                return (
                  <article key={item.id} className={styles.uploadQueueItem}>
                    <div className={styles.uploadQueuePreview}>
                      {item.previewUrl ? (
                        <img src={item.previewUrl} alt={item.file.name} className={styles.uploadQueueImage} />
                      ) : (
                        <MaterialSymbol
                          name={visual.icon}
                          className={styles.uploadQueuePlaceholderIcon}
                          fill={1}
                          weight={500}
                          opticalSize={24}
                        />
                      )}
                    </div>

                    <div className={styles.uploadQueueMeta}>
                      <strong>{item.file.name}</strong>
                      <p>
                        {visual.label} · {item.sizeLabel}
                      </p>

                      <div className={styles.itemProgressTrack}>
                        <div
                          className={styles.itemProgressFill}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>

                      {item.errorMessage ? <p className={styles.uploadQueueError}>{item.errorMessage}</p> : null}
                    </div>

                    <div className={styles.uploadQueueActions}>
                      <span className={styles.uploadQueueStatus}>
                        {item.status === "queued"
                          ? "En espera"
                          : item.status === "uploading"
                            ? `${item.progress}%`
                            : item.status === "uploaded"
                              ? "Subido"
                              : "Error"}
                      </span>

                      {item.status === "queued" || item.status === "error" ? (
                        <button
                          type="button"
                          className={styles.filterButton}
                          onClick={() => removeQueuedUpload(item.id)}
                          disabled={isUploadingBatch}
                        >
                          Quitar
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </article>
        ) : null}

        <div className={styles.searchSortRow}>
          <label className={styles.searchLabel}>
            <MaterialSymbol
              name="search"
              className={styles.searchIcon}
              weight={500}
              opticalSize={18}
            />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Buscar archivos..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Buscar archivos por nombre"
            />
          </label>

          <label className={styles.sortLabel}>
            <span>Ordenar por</span>
            <select
              className={styles.sortSelect}
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as "recientes" | "az")}
              aria-label="Ordenar subcarpetas y archivos"
            >
              <option value="recientes">Más recientes</option>
              <option value="az">A-Z</option>
            </select>
          </label>
        </div>

        {childFolders.length > 0 && (
          <section className={styles.featuredSection}>
            <h2>Subcarpetas</h2>

            <div className={styles.subfolderGrid}>
              {filteredAndSortedFolders.map((subfolder) => (
                <article
                  key={subfolder.id}
                  className={`${styles.folderCard} ${styles.subfolderCard}`}
                  data-folder-card="true"
                  tabIndex={0}
                  onClick={(event) => handleSubfolderCardClick(event, subfolder.id)}
                  onKeyDown={(event) => handleSubfolderCardKeyDown(event, subfolder.id)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    openFolderContextMenu(subfolder.id, event.clientX, event.clientY);
                  }}
                  onDoubleClick={() => openFolder(subfolder.id)}
                >
                  <div className={styles.cardHead}>
                    <span className={styles.folderIconWrap}>
                      <MaterialSymbol
                        name="folder"
                        className={styles.folderIcon}
                        fill={1}
                        weight={500}
                        opticalSize={22}
                      />
                    </span>

                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className={styles.cardMenuTriggerButton}
                        data-folder-menu-trigger="true"
                        aria-label={`Abrir menú de opciones de ${subfolder.name}`}
                        aria-haspopup="menu"
                        aria-expanded={folderContextMenu?.folderId === subfolder.id}
                        onDoubleClick={(event) => event.stopPropagation()}
                        onClick={(event) => handleFolderMenuButtonClick(event, subfolder)}
                      >
                        <MaterialSymbol
                          name="more_vert"
                          className={styles.cardMenuTriggerIcon}
                          weight={500}
                          opticalSize={18}
                        />
                      </button>
                    </div>
                  </div>

                  <div className={styles.cardBody}>
                    <h3>
                      <button
                        type="button"
                        className={styles.folderNameButton}
                        onClick={() => openFolder(subfolder.id)}
                        aria-label={`Abrir carpeta ${subfolder.name}`}
                      >
                        {subfolder.name}
                      </button>
                    </h3>

                    <div className={styles.cardFooter}>
                      <span className={styles.filesCount}>
                        <MaterialSymbol
                          name="video_library"
                          className={styles.filesIcon}
                          weight={500}
                          opticalSize={16}
                        />
                        {subfolder.fileCount} archivos
                      </span>

                      <div className={styles.tags}>
                        {subfolder.tags.map((tag) => (
                          <span key={`${subfolder.id}-${tag}`} className={styles.tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className={styles.featuredSection}>
          <h2>
            Archivos de la carpeta
            {searchQuery.trim() ? (
              <span className={styles.sectionCount}>
                {filteredAndSortedFiles.length} de {files.length}
              </span>
            ) : (
              <span className={styles.sectionCount}>{files.length}</span>
            )}
          </h2>

          {selectedCount > 0 ? (
            <section className={styles.selectionToolbar} aria-live="polite">
              <div className={styles.selectionToolbarInfo}>
                <MaterialSymbol
                  name="check_circle"
                  className={styles.selectionToolbarIcon}
                  fill={1}
                  weight={500}
                  opticalSize={18}
                />
                <p>
                  <strong>{selectedCount}</strong> seleccionado
                  {selectedCount > 1 ? "s" : ""}
                </p>
              </div>

              <div className={styles.selectionToolbarActions}>
                <button
                  type="button"
                  className={styles.filterButton}
                  onClick={toggleSelectAll}
                  aria-label={allSelected ? "Deseleccionar todo" : "Seleccionar todo"}
                >
                  <MaterialSymbol
                    name={allSelected ? "remove_done" : "select_all"}
                    className={styles.filterIcon}
                    weight={500}
                    opticalSize={18}
                  />
                  {allSelected ? "Deseleccionar todo" : "Seleccionar todo"}
                </button>

                <button
                  type="button"
                  className={styles.filterButton}
                  onClick={clearSelection}
                  aria-label="Limpiar selección"
                >
                  <MaterialSymbol
                    name="close"
                    className={styles.filterIcon}
                    weight={500}
                    opticalSize={18}
                  />
                  Limpiar selección
                </button>
              </div>
            </section>
          ) : null}

          <div className={styles.folderFilesGrid}>
            {filteredAndSortedFiles.map((file) => {
              const visual = getFileVisual(file.type);
              const mediaToneClass =
                visual.cardTone === "image"
                  ? styles.fileMediaToneImage
                  : styles.fileMediaToneVideo;
              const isSelected = selectedFileIds.includes(file.id);
              const checkboxId = `file-selection-${file.id}`;

              return (
                <article
                  key={file.id}
                  className={`${styles.folderCard} ${styles.folderFileCard} ${isSelected ? styles.folderFileCardSelected : ""}`}
                  data-file-card="true"
                  onContextMenu={(event) => {
                    event.preventDefault();
                    openFileContextMenu(file.id, event.clientX, event.clientY);
                  }}
                >
                  <div className={styles.fileMedia}>
                    <div className={`${styles.fileMediaSurface} ${mediaToneClass}`}>
                      {file.thumbnailUrl ? (
                        <img
                          src={file.thumbnailUrl}
                          alt={file.name}
                          className={styles.fileMediaPreviewImage}
                        />
                      ) : file.viewUrl ? (
                        file.type === "image" ? (
                          <img
                            src={file.viewUrl}
                            alt={file.name}
                            className={styles.fileMediaPreviewImage}
                          />
                        ) : (
                          <video
                            src={file.viewUrl}
                            className={styles.fileMediaPreviewVideo}
                            muted
                            playsInline
                            preload="metadata"
                          />
                        )
                      ) : (
                        <div className={styles.fileMediaPreview}>
                          <MaterialSymbol
                            name={visual.icon}
                            className={styles.fileMediaIcon}
                            fill={1}
                            weight={500}
                            opticalSize={28}
                          />
                          <span className={styles.fileMediaType}>{visual.label}</span>
                        </div>
                      )}

                      <div className={styles.fileMediaOverlay}>
                        <div className={`${styles.cardBody} ${styles.fileCardBody}`}>
                          <h3>{file.name}</h3>
                          <p className={styles.cardMeta}>Actualizado {file.updatedAt}</p>
                        </div>
                      </div>
                    </div>

                    <label
                      className={`${styles.fileSelectionButton} ${isSelected ? styles.fileSelectionButtonSelected : ""}`}
                      htmlFor={checkboxId}
                      aria-label={`${isSelected ? "Deseleccionar" : "Seleccionar"} ${file.name}`}
                    >
                      <input
                        id={checkboxId}
                        type="checkbox"
                        className={styles.fileSelectionInput}
                        checked={isSelected}
                        onChange={() => toggleFileSelection(file.id)}
                      />
                      <MaterialSymbol
                        name={isSelected ? "check_box" : "check_box_outline_blank"}
                        className={styles.cardActionIcon}
                        weight={500}
                        opticalSize={18}
                      />
                    </label>

                    <div className={styles.fileCardActions}>
                      <button
                        type="button"
                        className={`${styles.cardActionButton} ${styles.fileMenuButton}`}
                        data-file-menu-trigger="true"
                        aria-label={`Abrir acciones de ${file.name}`}
                        aria-haspopup="menu"
                        aria-expanded={fileContextMenu?.fileId === file.id}
                        onClick={(event) => handleFileMenuButtonClick(event, file)}
                      >
                        <MaterialSymbol
                          name="more_vert"
                          className={styles.cardActionIcon}
                          weight={500}
                          opticalSize={18}
                        />
                      </button>
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <span className={styles.filesCount}>
                      <MaterialSymbol
                        name="timer"
                        className={styles.filesIcon}
                        weight={500}
                        opticalSize={16}
                      />
                      {file.duration}
                    </span>

                    <div className={styles.tags}>
                      <span className={styles.tag}>{visual.label}</span>
                      <span className={styles.tag}>{file.sizeLabel}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <div className={styles.localGlowPrimary} aria-hidden="true" />
      <div className={styles.localGlowSecondary} aria-hidden="true" />

      {activeContextMenuFolder && folderContextMenu ? (
        <div
          className={styles.fileContextMenu}
          role="menu"
          aria-label={`Opciones para ${activeContextMenuFolder.name}`}
          data-folder-context-menu="true"
          style={{
            left: `${folderContextMenu.x}px`,
            top: `${folderContextMenu.y}px`,
          }}
        >
          <button
            type="button"
            className={styles.fileContextMenuItem}
            role="menuitem"
            onClick={() => openRenameFolderModal(activeContextMenuFolder)}
          >
            <MaterialSymbol
              name="edit"
              className={styles.fileContextMenuIcon}
              weight={500}
              opticalSize={18}
            />
            Editar
          </button>

          <button
            type="button"
            className={`${styles.fileContextMenuItem} ${styles.fileContextMenuItemDanger}`}
            role="menuitem"
            onClick={() => openDeleteFolderModal(activeContextMenuFolder)}
          >
            <MaterialSymbol
              name="delete"
              className={styles.fileContextMenuIcon}
              weight={500}
              opticalSize={18}
            />
            Eliminar
          </button>
        </div>
      ) : null}

      {activeContextMenuFile && fileContextMenu ? (
        <div
          className={styles.fileContextMenu}
          role="menu"
          aria-label={`Acciones para ${activeContextMenuFile.name}`}
          data-file-context-menu="true"
          style={{
            left: `${fileContextMenu.x}px`,
            top: `${fileContextMenu.y}px`,
          }}
        >
          <button
            type="button"
            className={styles.fileContextMenuItem}
            role="menuitem"
            onClick={() => openRenameModal(activeContextMenuFile)}
          >
            <MaterialSymbol
              name="drive_file_rename_outline"
              className={styles.fileContextMenuIcon}
              weight={500}
              opticalSize={18}
            />
            Renombrar
          </button>

          <button
            type="button"
            className={styles.fileContextMenuItem}
            role="menuitem"
            onClick={() => handleDownload(activeContextMenuFile)}
            disabled={downloadingFileId === activeContextMenuFile.id}
          >
            <MaterialSymbol
              name="download"
              className={styles.fileContextMenuIcon}
              weight={500}
              opticalSize={18}
            />
            {downloadingFileId === activeContextMenuFile.id ? "Descargando..." : "Descargar"}
          </button>

          <button
            type="button"
            className={`${styles.fileContextMenuItem} ${styles.fileContextMenuItemDanger}`}
            role="menuitem"
            onClick={() => openDeleteModal(activeContextMenuFile)}
          >
            <MaterialSymbol
              name="delete"
              className={styles.fileContextMenuIcon}
              weight={500}
              opticalSize={18}
            />
            Eliminar
          </button>
        </div>
      ) : null}

      {editingFolder ? (
        <div className={styles.modalOverlay} role="presentation" onClick={() => closeRenameFolderModal()}>
          <div
            className={styles.editModal}
            role="dialog"
            aria-modal="true"
            aria-label={`Editar carpeta ${editingFolder.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.modalHeader}>
              <div>
                <h2>Editar carpeta</h2>
                <p>Actualizá el nombre para mantener tu videoteca ordenada.</p>
              </div>

              <button
                type="button"
                className={styles.modalCloseButton}
                aria-label="Cerrar modal"
                onClick={() => closeRenameFolderModal()}
              >
                <MaterialSymbol
                  name="close"
                  className={styles.modalCloseIcon}
                  weight={500}
                  opticalSize={22}
                />
              </button>
            </header>

            <div className={styles.modalBody}>
              <label className={styles.modalField}>
                <span>Nombre de la carpeta</span>
                <input
                  type="text"
                  value={draftFolderName}
                  onChange={(event) => setDraftFolderName(event.target.value)}
                  placeholder="Ej: Bloque avanzado"
                  autoFocus
                />
              </label>
            </div>

            <footer className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelGhostButton}
                onClick={() => closeRenameFolderModal()}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={styles.modalConfirmButton}
                onClick={handleConfirmRenameFolder}
                disabled={!normalizeFolderName(draftFolderName)}
              >
                <MaterialSymbol
                  name="save"
                  className={styles.confirmIcon}
                  fill={1}
                  weight={500}
                  opticalSize={18}
                />
                Guardar cambios
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {isCreateModalOpen ? (
        <div className={styles.modalOverlay} role="presentation" onClick={() => closeCreateModal()}>
          <div
            className={styles.editModal}
            role="dialog"
            aria-modal="true"
            aria-label="Crear carpeta"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.modalHeader}>
              <div>
                <h2>Crear carpeta</h2>
                <p>Prepará una nueva subcarpeta dentro de esta carpeta de videoteca.</p>
              </div>

              <button
                type="button"
                className={styles.modalCloseButton}
                aria-label="Cerrar modal"
                onClick={() => closeCreateModal()}
                disabled={isCreatingFolder}
              >
                <MaterialSymbol
                  name="close"
                  className={styles.modalCloseIcon}
                  weight={500}
                  opticalSize={22}
                />
              </button>
            </header>

            <div className={styles.modalBody}>
              <label className={styles.modalField}>
                <span>Nombre de la carpeta</span>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(event) => setNewFolderName(event.target.value)}
                  placeholder="Ej: Técnica de sentadilla"
                  autoFocus
                />
              </label>
            </div>

            <footer className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelGhostButton}
                onClick={() => closeCreateModal()}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={styles.modalConfirmButton}
                onClick={handleConfirmCreateFolder}
                disabled={!normalizeFolderName(newFolderName)}
              >
                <MaterialSymbol
                  name="create_new_folder"
                  className={styles.confirmIcon}
                  fill={1}
                  weight={500}
                  opticalSize={18}
                />
                Crear carpeta
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {editingFile ? (
        <div className={styles.modalOverlay} role="presentation" onClick={closeRenameModal}>
          <div
            className={styles.editModal}
            role="dialog"
            aria-modal="true"
            aria-label={`Renombrar archivo ${editingFile.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.modalHeader}>
              <div>
                <h2>Renombrar archivo</h2>
                <p>Actualizá el nombre sin perder selección ni contexto de carpeta.</p>
              </div>

              <button
                type="button"
                className={styles.modalCloseButton}
                aria-label="Cerrar modal"
                onClick={closeRenameModal}
              >
                <MaterialSymbol
                  name="close"
                  className={styles.modalCloseIcon}
                  weight={500}
                  opticalSize={22}
                />
              </button>
            </header>

            <div className={styles.modalBody}>
              <label className={styles.modalField}>
                <span>Nombre del archivo</span>
                <input
                  type="text"
                  value={draftFileName}
                  onChange={(event) => setDraftFileName(event.target.value)}
                  placeholder="Ej: Sentadilla isométrica técnica"
                  autoFocus
                />
              </label>
            </div>

            <footer className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelGhostButton}
                onClick={closeRenameModal}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={styles.modalConfirmButton}
                onClick={handleConfirmRename}
                disabled={!draftFileName.trim()}
              >
                <MaterialSymbol
                  name="save"
                  className={styles.confirmIcon}
                  fill={1}
                  weight={500}
                  opticalSize={18}
                />
                Guardar nombre
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {activeDeleteFile ? (
        <DestructiveConfirmationModal
          ariaLabel={`Eliminar archivo ${activeDeleteFile.name}`}
          title="¿Eliminar archivo?"
          description="Esta acción elimina el archivo de la carpeta y no se puede deshacer desde esta vista."
          headerAlignment="center"
          density="compact"
          confirmLabel="Eliminar archivo"
          pendingConfirmLabel="Eliminando..."
          errorMessage={actionError}
          isPending={isDeletingFile}
          onConfirm={handleConfirmDelete}
          onCancel={closeDeleteModal}
          targetCard={
            <>
              <div>
                <small>{folder?.name ?? "Carpeta"}</small>
                <strong>{activeDeleteFile.name}</strong>
              </div>

              <em>
                {activeDeleteFile.type === "video" ? "Video" : "Imagen"} · {activeDeleteFile.sizeLabel}
              </em>
            </>
          }
        />
      ) : null}

      {activeDeleteFolder ? (
        <DestructiveConfirmationModal
          ariaLabel={`Eliminar carpeta ${activeDeleteFolder.name}`}
          title="¿Eliminar carpeta?"
          description="Esta acción elimina la subcarpeta de la videoteca y no se puede deshacer desde esta vista."
          headerAlignment="center"
          density="compact"
          confirmLabel="Eliminar carpeta"
          pendingConfirmLabel="Eliminando..."
          errorMessage={null}
          isPending={isDeletingFolder}
          onConfirm={handleConfirmDeleteFolder}
          onCancel={closeDeleteFolderModal}
          targetCard={
            <>
              <div>
                <small>{folder?.name ?? "Carpeta"}</small>
                <strong>{activeDeleteFolder.name}</strong>
              </div>

              <em>{activeDeleteFolder.fileCount} archivos</em>
            </>
          }
        />
      ) : null}
    </section>
  );
}
