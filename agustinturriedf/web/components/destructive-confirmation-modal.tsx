import { type ReactNode } from "react";
import { MaterialSymbol } from "@/components/material-symbol";
import styles from "@/components/destructive-confirmation-modal.module.css";

type DestructiveConfirmationModalProps = {
  ariaLabel: string;
  title: string;
  description: string;
  headerAlignment?: "start" | "center";
  confirmLabel?: string;
  cancelLabel?: string;
  density?: "default" | "compact";
  targetCard: ReactNode;
  errorMessage?: string | null;
  isPending?: boolean;
  pendingConfirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DestructiveConfirmationModal({
  ariaLabel,
  title,
  description,
  headerAlignment = "start",
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  density = "default",
  targetCard,
  errorMessage = null,
  isPending = false,
  pendingConfirmLabel = "Procesando...",
  onConfirm,
  onCancel,
}: DestructiveConfirmationModalProps) {
  const deleteModalClassName = density === "compact" ? `${styles.deleteModal} ${styles.deleteModal_compact}` : styles.deleteModal;
  const deleteHeaderClassName = headerAlignment === "center" ? `${styles.deleteHeader} ${styles.deleteHeader_center}` : styles.deleteHeader;

  return (
    <div
      className={styles.modalOverlay}
      role="presentation"
      onClick={() => {
        if (isPending) return;
        onCancel();
      }}
    >
      <div className={deleteModalClassName} role="dialog" aria-modal="true" aria-label={ariaLabel} aria-busy={isPending} onClick={(event) => event.stopPropagation()}>
        <button type="button" className={styles.deleteClose} aria-label="Cerrar modal" onClick={onCancel} disabled={isPending}>
          <MaterialSymbol name="close" className={styles.modalCloseIcon} weight={500} opticalSize={22} />
        </button>

        <div className={deleteHeaderClassName}>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <section className={styles.deleteTargetCard}>{targetCard}</section>

        {errorMessage ? <p className={styles.modalError}>{errorMessage}</p> : null}

        <footer className={styles.deleteActions}>
          <button type="button" className={styles.modalDeleteCancelButton} onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </button>
          <button type="button" className={styles.modalDeleteButton} onClick={onConfirm} disabled={isPending}>
            {isPending ? pendingConfirmLabel : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
