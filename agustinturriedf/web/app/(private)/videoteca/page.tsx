"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(private)/videoteca/videoteca.module.css";
import { DestructiveConfirmationModal } from "@/components/destructive-confirmation-modal";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";
import {
  buildFolderDraft,
  MOCK_VIDEOTECA_FOLDERS,
  normalizeFolderName,
} from "@/app/(private)/videoteca/videoteca.service";

type FolderCard = {
  id: string;
  name: string;
  updatedAt: string;
  fileCount: number;
  tags: string[];
};

type FolderContextMenuState = {
  folderId: string;
  x: number;
  y: number;
};

export default function VideotecaPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<FolderCard[]>(MOCK_VIDEOTECA_FOLDERS);
  const [folderContextMenu, setFolderContextMenu] =
    useState<FolderContextMenuState | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [activeDeleteFolder, setActiveDeleteFolder] =
    useState<FolderCard | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [draftFolderName, setDraftFolderName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");

  const editingFolder = editingFolderId
    ? (folders.find((folder) => folder.id === editingFolderId) ?? null)
    : null;

  const activeContextMenuFolder = folderContextMenu
    ? (folders.find((folder) => folder.id === folderContextMenu.folderId) ?? null)
    : null;

  const closeFolderContextMenu = () => {
    setFolderContextMenu(null);
  };

  const getSafeMenuPosition = (x: number, y: number) => {
    const MENU_WIDTH = 176;
    const MENU_HEIGHT = 108;
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
  };

  const openFolderContextMenu = (folderId: string, x: number, y: number) => {
    const safePosition = getSafeMenuPosition(x, y);

    setFolderContextMenu({
      folderId,
      x: safePosition.x,
      y: safePosition.y,
    });
  };

  const handleFolderMenuButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    folder: FolderCard,
  ) => {
    event.stopPropagation();

    if (folderContextMenu?.folderId === folder.id) {
      closeFolderContextMenu();
      return;
    }

    const triggerRect = event.currentTarget.getBoundingClientRect();

    openFolderContextMenu(folder.id, triggerRect.right - 6, triggerRect.bottom + 8);
  };

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

    const exists = folders.some((folder) => folder.id === folderContextMenu.folderId);
    if (!exists) {
      closeFolderContextMenu();
    }
  }, [folders, folderContextMenu]);

  const openEditModal = (folder: FolderCard) => {
    closeFolderContextMenu();
    setEditingFolderId(folder.id);
    setDraftFolderName(folder.name);
  };

  const closeEditModal = () => {
    setEditingFolderId(null);
    setDraftFolderName("");
  };

  const handleConfirmEdit = () => {
    const nextName = draftFolderName.trim();
    if (!editingFolderId || !nextName) return;

    setFolders((currentFolders) =>
      currentFolders.map((folder) =>
        folder.id === editingFolderId ? { ...folder, name: nextName } : folder,
      ),
    );

    closeEditModal();
  };

  const openDeleteModal = (folder: FolderCard) => {
    closeFolderContextMenu();
    setActiveDeleteFolder(folder);
  };

  const closeDeleteModal = () => {
    setActiveDeleteFolder(null);
  };

  const handleConfirmDelete = () => {
    if (!activeDeleteFolder) return;

    setFolders((currentFolders) =>
      currentFolders.filter((folder) => folder.id !== activeDeleteFolder.id),
    );
    closeDeleteModal();
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
    setNewFolderName("");
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setNewFolderName("");
  };

  const handleConfirmCreate = () => {
    const folderDraft = buildFolderDraft({ name: newFolderName });

    if (!folderDraft) return;

    setFolders((currentFolders) => [folderDraft, ...currentFolders]);
    closeCreateModal();
  };

  const openFolder = (folderId: string) => {
    router.push(`/videoteca/${folderId}`);
  };

  return (
    <section className={styles.page}>
      <PrivateBreadcrumb current="Videoteca" />
      <PrivateTopbar title="Gestión de Videoteca" subtitle="Administra tus fotos, videos y carpetas de manera eficiente en un solo lugar." />

      <div className={styles.content}>
        <section className={styles.controlsRow}>
          <div className={styles.controlsMain}>
            <div className={styles.filtersWrap}>
              <label className={styles.sortWrap}>
                <select
                  defaultValue="Más recientes"
                  aria-label="Ordenar carpeta"
                >
                  <option>Más recientes</option>
                  <option>A-Z</option>
                  <option>Más archivos</option>
                </select>
                <MaterialSymbol
                  name="expand_more"
                  className={styles.selectIcon}
                  weight={500}
                  opticalSize={18}
                />
              </label>

              <button type="button" className={styles.filterButton}>
                <MaterialSymbol
                  name="filter_alt"
                  className={styles.filterIcon}
                  weight={500}
                  opticalSize={18}
                />
                Filtrar
              </button>
            </div>

            <div
              className={styles.viewToggle}
              role="group"
              aria-label="Cambiar vista de carpetas"
            >
              <button
                type="button"
                className={`${styles.viewButton} ${styles.viewButtonActive}`}
                aria-label="Vista de grilla"
              >
                <MaterialSymbol
                  name="grid_view"
                  className={styles.viewIcon}
                  weight={500}
                  opticalSize={20}
                />
              </button>
              <button
                type="button"
                className={styles.viewButton}
                aria-label="Vista de lista"
              >
                <MaterialSymbol
                  name="view_list"
                  className={styles.viewIcon}
                  weight={500}
                  opticalSize={20}
                />
              </button>
            </div>
          </div>

          <button
            type="button"
            className={styles.createFolderButton}
            onClick={openCreateModal}
          >
            <MaterialSymbol
              name="create_new_folder"
              className={styles.createFolderIcon}
              fill={1}
              weight={500}
              opticalSize={20}
            />
            <span>+ Nueva carpeta</span>
          </button>
        </section>

        <section className={styles.folderGrid}>
          {folders.map((folder) => (
            <article
              key={folder.id}
              className={styles.folderCard}
              data-folder-card="true"
              onContextMenu={(event) => {
                event.preventDefault();
                openFolderContextMenu(folder.id, event.clientX, event.clientY);
              }}
              onDoubleClick={() => openFolder(folder.id)}
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
                    aria-label={`Abrir menú de opciones de ${folder.name}`}
                    aria-haspopup="menu"
                    aria-expanded={folderContextMenu?.folderId === folder.id}
                    onDoubleClick={(event) => event.stopPropagation()}
                    onClick={(event) => handleFolderMenuButtonClick(event, folder)}
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
                    onClick={() => openFolder(folder.id)}
                    aria-label={`Abrir carpeta ${folder.name}`}
                  >
                    {folder.name}
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
                    {folder.fileCount} archivos
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
          ))}

          <button
            type="button"
            className={styles.addCard}
            onClick={openCreateModal}
            aria-label="Crear carpeta"
          >
            <span className={styles.addCardIconWrap}>
              <MaterialSymbol
                name="create_new_folder"
                className={styles.addCardIcon}
                weight={500}
                opticalSize={24}
              />
            </span>
            <p>Crear carpeta</p>
          </button>
        </section>

        <section className={styles.featuredSection}>
          <h2>Videos recientes destacados</h2>

          <div className={styles.featuredGrid}>
            <article className={styles.masterCard}>
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhWWoE49lN5SVlc01PdlApLpKxO0qJD1GtcDGyQXM9CmTU7ukxomyZRlxXcyuBiPDOPDExU1qXNcxNuarc6n8L3BuLGhYSHGHyUKJP2o2ltzvxx9OZ_L2xicOX04EC_9Ptk8c_awkgwqdXSsxqEAkt6tD7cuvnreMI0uBju6YBjPQKmjmv9YIKkRlfP49-_FOe0tsuetJCWz59byW3MKXSWQKT3h26JYPDl7-J5AYWIu6P1RIkogPE9mDs5PE2Yn_8jDRy_AaTs3kv"
                alt="Atleta realizando sentadilla con barra"
              />

              <div className={styles.masterOverlay} aria-hidden="true" />

              <div className={styles.masterContent}>
                <span className={styles.masterBadge}>Masterclass</span>
                <h3>ESTABILIDAD DE CORE NIVEL 3</h3>
                <p>
                  Explicación técnica detallada sobre la activación del
                  transverso abdominal durante cargas máximas.
                </p>
              </div>

              <button
                type="button"
                className={styles.playButton}
                aria-label="Reproducir video destacado"
              >
                <MaterialSymbol
                  name="play_arrow"
                  className={styles.playIcon}
                  fill={1}
                  weight={500}
                  opticalSize={36}
                />
              </button>
            </article>

            <article className={styles.tipCard}>
              <div className={styles.tipCopy}>
                <MaterialSymbol
                  name="tips_and_updates"
                  className={styles.tipIcon}
                  fill={1}
                  weight={500}
                  opticalSize={36}
                />
                <h3>Tip del día: Movilidad de Tobillo</h3>
                <p>
                  El 80% de los problemas en sentadilla profunda derivan de una
                  dorsiflexión limitada. Revisá la carpeta de Mobility
                  Foundations para ver el nuevo video explicativo.
                </p>
              </div>

              <button type="button" className={styles.tipButton}>
                Ver carpeta
              </button>
            </article>
          </div>
        </section>
      </div>

      <button type="button" className={styles.fab} aria-label="Subir video">
        <MaterialSymbol
          name="cloud_upload"
          className={styles.fabIcon}
          fill={1}
          weight={500}
          opticalSize={24}
        />
      </button>

      <div className={styles.localGlowPrimary} aria-hidden="true" />
      <div className={styles.localGlowSecondary} aria-hidden="true" />

      {activeContextMenuFolder && folderContextMenu ? (
        <div
          className={styles.folderContextMenu}
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
            className={styles.folderContextMenuItem}
            role="menuitem"
            onClick={() => openEditModal(activeContextMenuFolder)}
          >
            <MaterialSymbol
              name="edit"
              className={styles.folderContextMenuItemIcon}
              weight={500}
              opticalSize={18}
            />
            Editar
          </button>

          <button
            type="button"
            className={`${styles.folderContextMenuItem} ${styles.folderContextMenuItemDelete}`}
            role="menuitem"
            onClick={() => openDeleteModal(activeContextMenuFolder)}
          >
            <MaterialSymbol
              name="delete"
              className={styles.folderContextMenuItemIcon}
              weight={500}
              opticalSize={18}
            />
            Eliminar
          </button>
        </div>
      ) : null}

      {editingFolder ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={closeEditModal}
        >
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
                onClick={closeEditModal}
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
                  placeholder="Ej: Movilidad avanzada"
                />
              </label>
            </div>

            <footer className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelGhostButton}
                onClick={closeEditModal}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={styles.modalConfirmButton}
                onClick={handleConfirmEdit}
                disabled={!draftFolderName.trim()}
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
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={closeCreateModal}
        >
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
                <p>Prepará una nueva carpeta para organizar contenido de la videoteca.</p>
              </div>

              <button
                type="button"
                className={styles.modalCloseButton}
                aria-label="Cerrar modal"
                onClick={closeCreateModal}
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
                  placeholder="Ej: Movilidad avanzada"
                  autoFocus
                />
              </label>
            </div>

            <footer className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelGhostButton}
                onClick={closeCreateModal}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={styles.modalConfirmButton}
                onClick={handleConfirmCreate}
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

      {activeDeleteFolder ? (
        <DestructiveConfirmationModal
          ariaLabel={`Eliminar carpeta ${activeDeleteFolder.name}`}
          title="¿Eliminar carpeta?"
          description="Esta acción elimina la carpeta de esta videoteca y no se puede deshacer desde esta vista."
          headerAlignment="center"
          density="compact"
          confirmLabel="Eliminar carpeta"
          onConfirm={handleConfirmDelete}
          onCancel={closeDeleteModal}
          targetCard={
            <>
              <div>
                <small>Videoteca</small>
                <strong>{activeDeleteFolder.name}</strong>
              </div>

              <em>
                {activeDeleteFolder.fileCount} archivos
              
              </em>
            </>
          }
        />
      ) : null}
    </section>
  );
}
