"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import styles from "@/app/(private)/videoteca/[folderId]/folder-detail.module.css";
import {
  fetchVideotecaFolderDetail,
  formatVideotecaSize,
  uploadVideotecaFile,
  type VideotecaFile,
  type VideotecaFolder,
  validateVideotecaFileForUpload,
} from "@/app/(private)/videoteca/videoteca.service";
import { DestructiveConfirmationModal } from "@/components/destructive-confirmation-modal";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";

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
  const routeParams = useParams<{ folderId: string }>();
  const folderId = routeParams?.folderId ?? "";
  const [folder, setFolder] = useState<VideotecaFolder | null>(null);
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
  const [uploadFeedbackError, setUploadFeedbackError] = useState<string | null>(null);
  const [uploadFeedbackSuccess, setUploadFeedbackSuccess] = useState<string | null>(null);
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

  const isNotFoundError =
    loadingError?.toLocaleLowerCase("es-AR").includes("no encontrada") ?? false;

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

    const loadFolder = async () => {
      try {
        setIsLoading(true);
        setLoadingError(null);
        const detail = await fetchVideotecaFolderDetail(fetch, folderId);
        if (cancelled) return;

        setFolder({
          id: detail.id,
          name: detail.name,
          updatedAt: detail.updatedAt,
          fileCount: detail.fileCount,
          tags: detail.tags,
        });
        setFiles(detail.files);
      } catch (error) {
        if (cancelled) return;
        setFolder(null);
        setFiles([]);
        setLoadingError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la carpeta de videoteca.",
        );
      } finally {
        if (!cancelled) {
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
    setUploadFeedbackError(null);
    setUploadFeedbackSuccess(null);
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

  const selectedCount = selectedFileIds.length;
  const allSelected = files.length > 0 && selectedCount === files.length;

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
    setDraftFileName(file.name);
    setEditingFileId(file.id);
    closeFileContextMenu();
  }

  function closeRenameModal() {
    setEditingFileId(null);
    setDraftFileName("");
  }

  function handleConfirmRename() {
    const nextName = draftFileName.trim().replace(/\s+/g, " ");

    if (!editingFileId || !nextName) return;

    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.id === editingFileId ? { ...file, name: nextName } : file,
      ),
    );

    // TODO: Reemplazar por llamada API de renombre cuando exista backend.
    closeRenameModal();
  }

  function openDeleteModal(file: VideotecaFile) {
    setActiveDeleteFileId(file.id);
    closeFileContextMenu();
  }

  function closeDeleteModal() {
    setActiveDeleteFileId(null);
  }

  function handleConfirmDelete() {
    if (!activeDeleteFileId) return;

    setFiles((currentFiles) =>
      currentFiles.filter((file) => file.id !== activeDeleteFileId),
    );
    setSelectedFileIds((currentSelectedIds) =>
      currentSelectedIds.filter((fileId) => fileId !== activeDeleteFileId),
    );

    // TODO: Reemplazar por llamada API de eliminación cuando exista backend.
    closeDeleteModal();
  }

  function handleDownload(file: VideotecaFile) {
    closeFileContextMenu();

    // TODO: Reemplazar por signed URL/stream de backend cuando exista persistencia real.
    const downloadPayload = [
      `Archivo: ${file.name}`,
      `Tipo: ${file.type}`,
      `Duración: ${file.duration}`,
      `Actualizado: ${file.updatedAt}`,
      `Tamaño: ${file.sizeLabel}`,
    ].join("\n");

    const blob = new Blob([downloadPayload], { type: "text/plain;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = blobUrl;
    anchor.download = `${file.name.replace(/[\\/:*?"<>|]+/g, "-")}.txt`;
    anchor.click();

    URL.revokeObjectURL(blobUrl);
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
      setUploadFeedbackSuccess(
        `${acceptedEntries.length} archivo${acceptedEntries.length === 1 ? "" : "s"} listo${acceptedEntries.length === 1 ? "" : "s"} para subir.`,
      );
    }

    if (rejectedMessages.length > 0) {
      setUploadFeedbackError(rejectedMessages.join(" "));
    } else {
      setUploadFeedbackError(null);
    }

    event.currentTarget.value = "";
  }

  async function handleUploadBatch() {
    if (!folder || queuedUploads.length === 0 || isUploadingBatch) return;

    setIsUploadingBatch(true);
    setUploadFeedbackError(null);
    setUploadFeedbackSuccess(null);
    setOverallUploadProgress(0);

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

    if (failedFiles.length > 0) {
      setUploadFeedbackError(
        `No se pudieron subir ${failedFiles.length} archivo${failedFiles.length === 1 ? "" : "s"}: ${failedFiles.join(", ")}`,
      );
    }

    if (uploadedFilesBatch.length > 0) {
      setUploadFeedbackSuccess(
        `Subida completada: ${uploadedFilesBatch.length} archivo${uploadedFilesBatch.length === 1 ? "" : "s"} agregado${uploadedFilesBatch.length === 1 ? "" : "s"} al final de la galería.`,
      );
    }

    setIsUploadingBatch(false);
  }

  if (isLoading && !folder) {
    return (
      <section className={styles.page}>
        <PrivateBreadcrumb current="Detalle de carpeta" />
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
        <PrivateBreadcrumb current="Detalle de carpeta" />
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

  return (
    <section className={styles.page}>
      <PrivateBreadcrumb current="Detalle de carpeta" />
      <PrivateTopbar
        title={folder.name}
        subtitle="Explorá y administrá los archivos de esta carpeta sin salir del flujo de Videoteca."
      />

      <div className={styles.content}>
        <section className={styles.controlsRow}>
          <div className={styles.controlsMain}>
            <Link href="/videoteca" className={styles.filterButton}>
              <MaterialSymbol
                name="arrow_back"
                className={styles.filterIcon}
                weight={500}
                opticalSize={18}
              />
              Volver a carpetas
            </Link>
          </div>

          <div className={styles.controlsActions}>
            <button
              type="button"
              className={styles.uploadButton}
              onClick={handleUploadButtonClick}
              disabled={isUploadingBatch}
            >
              <MaterialSymbol
                name="upload_file"
                className={styles.uploadButtonIcon}
                fill={1}
                weight={500}
                opticalSize={20}
              />
              <span>{isUploadingBatch ? "Subiendo..." : "Seleccionar archivos"}</span>
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

        {uploadFeedbackError ? <p className={styles.feedbackError}>{uploadFeedbackError}</p> : null}
        {uploadFeedbackSuccess ? <p className={styles.feedbackSuccess}>{uploadFeedbackSuccess}</p> : null}

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
                  name="cloud_upload"
                  className={styles.uploadButtonIcon}
                  fill={1}
                  weight={500}
                  opticalSize={20}
                />
                <span>Subir</span>
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

        <article className={`${styles.folderCard} ${styles.folderSummaryCard}`}>
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

            <span className={styles.tag}>Actualizado {folder.updatedAt}</span>
          </div>

          <div className={styles.cardBody}>
            <h3>{folder.name}</h3>
            <div className={styles.cardFooter}>
              <span className={styles.filesCount}>
                <MaterialSymbol
                  name="video_library"
                  className={styles.filesIcon}
                  weight={500}
                  opticalSize={16}
                />
                {files.length} archivos
              </span>

              <div className={styles.tags}>
                {folder.tags.map((tag) => (
                  <span key={`${folder.id}-${tag}`} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>

        <section className={styles.featuredSection}>
          <h2>Archivos de la carpeta</h2>

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
            {files.map((file) => {
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
          >
            <MaterialSymbol
              name="download"
              className={styles.fileContextMenuIcon}
              weight={500}
              opticalSize={18}
            />
            Descargar
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
          onConfirm={handleConfirmDelete}
          onCancel={closeDeleteModal}
          targetCard={
            <>
              <div>
                <small>{folder.name}</small>
                <strong>{activeDeleteFile.name}</strong>
              </div>

              <em>
                {activeDeleteFile.type === "video" ? "Video" : "Imagen"} · {activeDeleteFile.sizeLabel}
              </em>
            </>
          }
        />
      ) : null}
    </section>
  );
}
