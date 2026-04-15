"use client";

import { useState } from "react";
import styles from "@/app/(private)/videoteca/videoteca.module.css";
import { DestructiveConfirmationModal } from "@/components/destructive-confirmation-modal";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";

type FolderCard = {
  id: string;
  name: string;
  updatedAt: string;
  fileCount: number;
  tags: string[];
};

const initialFolders: FolderCard[] = [
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

export default function VideotecaPage() {
  const [folders, setFolders] = useState<FolderCard[]>(initialFolders);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [activeDeleteFolder, setActiveDeleteFolder] =
    useState<FolderCard | null>(null);
  const [draftFolderName, setDraftFolderName] = useState("");

  const editingFolder = editingFolderId
    ? (folders.find((folder) => folder.id === editingFolderId) ?? null)
    : null;

  const openEditModal = (folder: FolderCard) => {
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

          <button type="button" className={styles.createFolderButton}>
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
            <article key={folder.id} className={styles.folderCard}>
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
                    className={styles.cardActionButton}
                    aria-label={`Editar carpeta ${folder.name}`}
                    onClick={() => openEditModal(folder)}
                  >
                    <MaterialSymbol
                      name="edit"
                      className={styles.cardActionIcon}
                      weight={500}
                      opticalSize={18}
                    />
                  </button>

                  <button
                    type="button"
                    className={`${styles.cardActionButton} ${styles.cardActionDelete}`}
                    aria-label={`Eliminar carpeta ${folder.name}`}
                    onClick={() => openDeleteModal(folder)}
                  >
                    <MaterialSymbol
                      name="delete"
                      className={styles.cardActionIcon}
                      weight={500}
                      opticalSize={18}
                    />
                  </button>
                </div>
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

          <article className={styles.addCard}>
            <span className={styles.addCardIconWrap}>
              <MaterialSymbol
                name="create_new_folder"
                className={styles.addCardIcon}
                weight={500}
                opticalSize={24}
              />
            </span>
            <p>Crear carpeta</p>
          </article>
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
