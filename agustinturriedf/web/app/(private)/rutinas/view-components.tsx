import Link from "next/link";

import styles from "@/app/(private)/rutinas/rutinas.module.css";
import { MaterialSymbol } from "@/components/material-symbol";
import { buildRoutineDownloadUrl, type RoutineFile, type RoutineFolder } from "@/app/(private)/rutinas/runtime";

export const formatRoutineDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-AR");
};

export const formatRoutineSize = (sizeBytes: number) => {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 102.4) / 10} KB`;
  return `${Math.round(sizeBytes / 1024 / 102.4) / 10} MB`;
};

const getTypeChip = (type: RoutineFile["type"]) => {
  if (type === "pdf") {
    return {
      icon: "picture_as_pdf",
      borderClass: styles.template_pdf,
      iconClass: styles.fileIcon_pdf,
      chip: "PDF",
    };
  }

  if (type === "xls" || type === "xlsx") {
    return {
      icon: "description",
      borderClass: styles.template_excel,
      iconClass: styles.fileIcon_excel,
      chip: "Excel",
    };
  }

  return {
    icon: "insert_drive_file",
    borderClass: styles.template_generic,
    iconClass: styles.fileIcon_generic,
    chip: "Archivo",
  };
};

export const RoutineFolderGrid = ({
  folders,
  activeFolderId,
}: {
  folders: RoutineFolder[];
  activeFolderId?: string | null;
}) => {
  return (
    <div className={styles.folderGrid}>
      {folders.map((folder) => (
        <Link
          key={folder.id}
          href={`/rutinas/${folder.id}`}
          className={`${styles.folderCard} ${activeFolderId === folder.id ? styles.folderCardActive : ""}`}
          aria-label={`Abrir carpeta ${folder.displayName}`}
        >
          <div className={styles.cardHead}>
            <span className={styles.folderIconWrap}>
              <MaterialSymbol name="folder" className={styles.folderIcon} fill={1} weight={500} opticalSize={22} />
            </span>
          </div>

          <div className={styles.cardBody}>
            <h3>{folder.displayName}</h3>
            <div className={styles.cardFooter}>
              <span className={styles.filesCount}>
                <MaterialSymbol name="description" className={styles.filesIcon} weight={500} opticalSize={16} />
                {folder.files.length} archivo{folder.files.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export const RoutineFolderSummaryCard = ({ folder }: { folder: RoutineFolder }) => {
  return (
    <div className={styles.studentFolderCard}>
      <span className={styles.folderIconWrap}>
        <MaterialSymbol name="folder" className={styles.folderIcon} fill={1} weight={500} opticalSize={22} />
      </span>

      <div>
        <h3>{folder.displayName}</h3>
        <p>
          {folder.files.length} archivo{folder.files.length === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
};

export const RoutineFilesList = ({
  files,
  canDeleteFiles,
  onDelete,
  emptyMessage,
}: {
  files: RoutineFile[];
  canDeleteFiles: boolean;
  onDelete?: (file: RoutineFile) => void;
  emptyMessage: string;
}) => {
  return (
    <div className={styles.fileList}>
      {files.length === 0 ? <p className={styles.feedbackInfo}>{emptyMessage}</p> : null}

      {files.map((file) => {
        const visual = getTypeChip(file.type);

        return (
          <article key={file.id} className={`${styles.templateItem} ${visual.borderClass}`}>
            <div className={`${styles.fileIconWrap} ${visual.iconClass}`}>
              <MaterialSymbol name={visual.icon} className={styles.fileIcon} weight={420} opticalSize={28} />
            </div>

            <div className={styles.templateMeta}>
              <h3>{file.name}</h3>
              <div className={styles.templateDetails}>
                <span className={styles.chip}>{visual.chip}</span>
                <span className={styles.metaItem}>
                  <MaterialSymbol name="calendar_today" className={styles.metaIcon} weight={420} opticalSize={16} />
                  {formatRoutineDate(file.uploadedAt)}
                </span>
                <span className={styles.metaItem}>
                  <MaterialSymbol name="database" className={styles.metaIcon} weight={420} opticalSize={16} />
                  {formatRoutineSize(file.sizeBytes)}
                </span>
              </div>
            </div>

            <div className={styles.rowActions}>
              <a href={buildRoutineDownloadUrl(file.id)} className={styles.openButton}>
                Descargar
              </a>

              {canDeleteFiles && onDelete ? (
                <button
                  type="button"
                  className={`${styles.iconAction} ${styles.deleteAction}`}
                  aria-label={`Eliminar ${file.name}`}
                  onClick={() => onDelete(file)}
                >
                  <MaterialSymbol name="delete" className={styles.rowActionIcon} weight={500} opticalSize={20} />
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
};
