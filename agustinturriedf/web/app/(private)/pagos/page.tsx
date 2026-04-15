"use client";

import { type FormEvent, useEffect, useState } from "react";
import styles from "@/app/(private)/pagos/pagos.module.css";
import { DestructiveConfirmationModal } from "@/components/destructive-confirmation-modal";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";

type PaymentMetric = {
  icon: string;
  label: string;
  value: string;
  detail: string;
  tone: "primary" | "warning" | "error" | "monitor";
};

type PaymentRow = {
  id: string;
  initials: string;
  name: string;
  email: string;
  phone: string;
  amount: string;
  dueDate: string;
  daysToExpire: string;
  status: "Activo" | "Inactivo";
};

type EditablePaymentFields = Pick<PaymentRow, "name" | "email" | "phone" | "amount" | "dueDate" | "daysToExpire" | "status">;

const metrics: PaymentMetric[] = [
  {
    icon: "payments",
    label: "Pagos Cobrados",
    value: "0",
    detail: "$ 0,00",
    tone: "primary",
  },
  {
    icon: "warning",
    label: "Vence Pronto",
    value: "0",
    detail: "Próximos 3 días",
    tone: "warning",
  },
  {
    icon: "error",
    label: "Vencidos",
    value: "0",
    detail: "Pendiente: $ 0,00",
    tone: "error",
  },
  {
    icon: "monitoring",
    label: "Total Estimado",
    value: "$ 0,00",
    detail: "Alumnos: 1",
    tone: "monitor",
  },
];

const initialPayments: PaymentRow[] = [
  {
    id: "payment-1",
    initials: "MT",
    name: "Mariano Tarditi",
    email: "student@gmail.com",
    phone: "+54 9 11 1234 5678",
    amount: "$ 45.000",
    dueDate: "15/10/2023",
    daysToExpire: "3 días",
    status: "Activo",
  },
];

export default function PagosPage() {
  const [payments, setPayments] = useState<PaymentRow[]>(initialPayments);
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentRow | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState<EditablePaymentFields | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const editingPayment = editingPaymentId ? payments.find((payment) => payment.id === editingPaymentId) ?? null : null;

  const getInitialsFromName = (name: string) => {
    const initials = name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

    return initials || "--";
  };

  const openDeleteModal = (payment: PaymentRow) => {
    setPaymentToDelete(payment);
  };

  const closeDeleteModal = () => {
    setPaymentToDelete(null);
  };

  const openEditModal = (payment: PaymentRow) => {
    setEditingPaymentId(payment.id);
    setEditPaymentForm({
      name: payment.name,
      email: payment.email,
      phone: payment.phone,
      amount: payment.amount,
      dueDate: payment.dueDate,
      daysToExpire: payment.daysToExpire,
      status: payment.status,
    });
  };

  const closeEditModal = () => {
    setEditingPaymentId(null);
    setEditPaymentForm(null);
  };

  const handleConfirmDelete = () => {
    if (!paymentToDelete) return;

    setPayments((currentPayments) => currentPayments.filter((payment) => payment.id !== paymentToDelete.id));
    closeDeleteModal();
  };

  const handleEditPaymentField = <K extends keyof EditablePaymentFields>(field: K, value: EditablePaymentFields[K]) => {
    setEditPaymentForm((currentForm) => {
      if (!currentForm) return currentForm;

      return {
        ...currentForm,
        [field]: value,
      };
    });
  };

  const handleEditPaymentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingPaymentId || !editPaymentForm) {
      closeEditModal();
      return;
    }

    setPayments((currentPayments) =>
      currentPayments.map((payment) => {
        if (payment.id !== editingPaymentId) return payment;

        return {
          ...payment,
          ...editPaymentForm,
          initials: getInitialsFromName(editPaymentForm.name),
        };
      }),
    );

    closeEditModal();
  };

  const openRegisterModal = () => {
    setIsRegisterModalOpen(true);
  };

  const closeRegisterModal = () => {
    setIsRegisterModalOpen(false);
  };

  useEffect(() => {
    if (!isRegisterModalOpen && !editingPayment) return;

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isRegisterModalOpen) closeRegisterModal();
        if (editingPayment) closeEditModal();
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isRegisterModalOpen, editingPayment]);

  return (
    <section className={styles.page}>
      <PrivateBreadcrumb current="Pagos" />
      <PrivateTopbar
        title="Gestión de Pagos"
        subtitle="Visualiza estado financiero, vencimientos y recordatorios en una vista operativa para sostener ingresos y adherencia."
      />

      <div className={styles.content}>
        <section className={styles.metrics}>
          {metrics.map((metric) => (
            <article key={metric.label} className={styles.metricCard}>
              <div className={styles.metricGlow} aria-hidden="true" />
              <div className={styles.metricTop}>
                <span className={`${styles.metricIcon} ${styles[`metricIcon_${metric.tone}`]}`}>
                  <MaterialSymbol name={metric.icon} className={styles.metricSymbol} weight={500} opticalSize={20} />
                </span>
              </div>

              <h3 className={styles.metricLabel}>{metric.label}</h3>
              <p className={styles.metricValue}>
                {metric.value} <span className={styles[`metricDetail_${metric.tone}`]}>{metric.detail}</span>
              </p>
            </article>
          ))}
        </section>

        <section className={styles.tableSection}>
          <div className={styles.tableToolbar}>
            <label className={styles.searchWrap}>
              <MaterialSymbol name="search" className={styles.searchIcon} weight={420} opticalSize={18} />
              <input type="search" placeholder="Filtrar por nombre, email o teléfono..." />
            </label>

            <div className={styles.tableActions}>
              <button type="button" className={styles.sortButton}>
                <MaterialSymbol name="sort" className={styles.actionIcon} weight={450} opticalSize={20} />
                Ordenar vista
              </button>
              <button type="button" className={styles.createButton} onClick={openRegisterModal}>
                Registrar Pago
              </button>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <div className={styles.tableScroll}>
              <table>
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Monto</th>
                    <th>Próximo Venc.</th>
                    <th>Días a vencer</th>
                    <th>Estado</th>
                    <th className={styles.alignRight}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <div className={styles.studentWrap}>
                          <span className={styles.initials}>{payment.initials}</span>
                          <span className={styles.studentName}>{payment.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.subtleText}>{payment.email}</span>
                      </td>
                      <td>
                        <span className={styles.subtleText}>{payment.phone}</span>
                      </td>
                      <td>
                        <span className={styles.amount}>{payment.amount}</span>
                      </td>
                      <td>
                        <span className={styles.subtleText}>{payment.dueDate}</span>
                      </td>
                      <td>
                        <span className={styles.subtleText}>{payment.daysToExpire}</span>
                      </td>
                      <td>
                        <span className={styles.statusWrap}>
                          <span className={styles.statusDot} aria-hidden="true" />
                          <span className={styles.statusText}>{payment.status}</span>
                        </span>
                      </td>
                      <td className={styles.alignRight}>
                        <div className={styles.rowActions}>
                          <button type="button" className={styles.rowButton} aria-label={`Editar ${payment.name}`} onClick={() => openEditModal(payment)}>
                            <MaterialSymbol name="edit" className={styles.rowActionIcon} weight={500} opticalSize={20} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.rowButton} ${styles.rowButtonDanger}`}
                            aria-label={`Eliminar pago de ${payment.name}`}
                            onClick={() => openDeleteModal(payment)}
                          >
                            <MaterialSymbol name="delete" className={styles.rowActionIcon} weight={500} opticalSize={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className={styles.pagination}>
              <p>Página 1 de 1</p>

              <div className={styles.paginationControls}>
                <div className={styles.rowsControl}>
                  <p>Filas:</p>
                  <select defaultValue="10" aria-label="Filas por página">
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </div>

                <div className={styles.paginationButtons}>
                  <button type="button" disabled aria-label="Página anterior">
                    <MaterialSymbol name="chevron_left" className={styles.paginationIcon} weight={500} opticalSize={20} />
                  </button>
                  <button type="button" aria-label="Página siguiente">
                    <MaterialSymbol name="chevron_right" className={styles.paginationIcon} weight={500} opticalSize={20} />
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </section>
      </div>

      {paymentToDelete ? (
        <DestructiveConfirmationModal
          ariaLabel={`Eliminar pago de ${paymentToDelete.name}`}
          title="¿Eliminar registro de pago?"
          description="Este registro dejará de mostrarse en la tabla actual. Esta acción no se puede deshacer desde esta vista."
          headerAlignment="center"
          density="compact"
          confirmLabel="Eliminar pago"
          onConfirm={handleConfirmDelete}
          onCancel={closeDeleteModal}
          targetCard={
            <>
              <div className={styles.deletePaymentIconWrap}>
                <span className={styles.deletePaymentIconBadge}>
                  <MaterialSymbol name="payments" className={styles.deletePaymentIcon} weight={500} opticalSize={20} />
                </span>

                <span className={styles.deletePaymentDangerBadge}>
                  <MaterialSymbol
                    name="delete"
                    className={styles.deletePaymentDangerBadgeIcon}
                    fill={1}
                    weight={500}
                    opticalSize={14}
                  />
                </span>
              </div>

              <div>
                <small>Pagos</small>
                <strong>{paymentToDelete.name}</strong>
              </div>

              <em>
                {paymentToDelete.amount} · Vence {paymentToDelete.dueDate}
              </em>
            </>
          }
        />
      ) : null}

      {editingPayment && editPaymentForm ? (
        <div className={styles.modalOverlay} role="presentation" onClick={closeEditModal}>
          <div className={styles.editModal} role="dialog" aria-modal="true" aria-label="Editar pago" onClick={(event) => event.stopPropagation()}>
            <header className={styles.editHeader}>
              <div>
                <div className={styles.editTitleRow}>
                  <MaterialSymbol name="edit_note" className={styles.editSectionIcon} weight={500} opticalSize={20} />
                  <h2>Editar Pago</h2>
                </div>
                <p>Actualizá la información del cobro seleccionado.</p>
              </div>
              <button type="button" className={styles.modalCloseButton} aria-label="Cerrar modal" onClick={closeEditModal}>
                <MaterialSymbol name="close" className={styles.modalCloseIcon} weight={500} opticalSize={22} />
              </button>
            </header>

            <div className={styles.editBody}>
              <form id="edit-payment-form" className={styles.editForm} onSubmit={handleEditPaymentSubmit}>
                <label className={`${styles.fieldWrap} ${styles.editFullRow}`}>
                  <span>Alumno</span>
                  <input type="text" value={editPaymentForm.name} onChange={(event) => handleEditPaymentField("name", event.target.value)} />
                </label>

                <label className={styles.fieldWrap}>
                  <span>Email</span>
                  <input type="email" value={editPaymentForm.email} onChange={(event) => handleEditPaymentField("email", event.target.value)} />
                </label>

                <label className={styles.fieldWrap}>
                  <span>Teléfono</span>
                  <div className={styles.leadingIconInput}>
                    <MaterialSymbol name="phone_android" className={styles.leadingInputIcon} weight={500} opticalSize={18} />
                    <input type="tel" value={editPaymentForm.phone} onChange={(event) => handleEditPaymentField("phone", event.target.value)} />
                  </div>
                </label>

                <label className={styles.fieldWrap}>
                  <span>Monto</span>
                  <div className={styles.moneyInputWrap}>
                    <i>$</i>
                    <input
                      type="text"
                      value={editPaymentForm.amount.replace(/^\$\s*/, "")}
                      onChange={(event) => handleEditPaymentField("amount", `$ ${event.target.value}`)}
                    />
                  </div>
                </label>

                <label className={styles.fieldWrap}>
                  <span>Próximo vencimiento</span>
                  <div className={styles.leadingIconInput}>
                    <MaterialSymbol name="calendar_today" className={styles.leadingInputIcon} weight={500} opticalSize={16} />
                    <input
                      type="text"
                      value={editPaymentForm.dueDate}
                      onChange={(event) => handleEditPaymentField("dueDate", event.target.value)}
                    />
                  </div>
                </label>

                <label className={styles.fieldWrap}>
                  <span>Días a vencer</span>
                  <div className={styles.trailingUnitInput}>
                    <input
                      type="number"
                      min={0}
                      value={editPaymentForm.daysToExpire.replace(/\D/g, "")}
                      onChange={(event) => handleEditPaymentField("daysToExpire", `${event.target.value} días`)}
                    />
                    <i>días</i>
                  </div>
                </label>

                <label className={styles.fieldWrap}>
                  <span>Estado</span>
                  <div className={styles.selectWrap}>
                    <select
                      value={editPaymentForm.status}
                      onChange={(event) => handleEditPaymentField("status", event.target.value as PaymentRow["status"])}
                      aria-label="Estado del pago"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                    <MaterialSymbol name="expand_more" className={styles.selectIcon} weight={500} opticalSize={18} />
                  </div>
                </label>
              </form>
            </div>

            <footer className={styles.editFooter}>
              <button type="button" className={styles.modalCancelGhostButton} onClick={closeEditModal}>
                Cancelar
              </button>
              <button type="submit" className={styles.modalConfirmButton} form="edit-payment-form">
                <MaterialSymbol name="save" className={styles.confirmIcon} fill={1} weight={500} opticalSize={18} />
                Guardar cambios
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {isRegisterModalOpen ? (
        <div className={styles.modalOverlay} role="presentation" onClick={closeRegisterModal}>
          <div
            className={styles.registerModal}
            role="dialog"
            aria-modal="true"
            aria-label="Registrar pago"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.registerHeader}>
              <div>
                <div className={styles.registerTitleRow}>
                  <h2>Registrar Pago</h2>
                </div>
                <p>Completá los datos del cobro para visualizar el registro en esta vista.</p>
              </div>
              <button type="button" className={styles.modalCloseButton} aria-label="Cerrar modal" onClick={closeRegisterModal}>
                <MaterialSymbol name="close" className={styles.modalCloseIcon} weight={500} opticalSize={22} />
              </button>
            </header>

            <div className={styles.registerBody}>
              <form
                id="register-payment-form"
                className={styles.registerForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  closeRegisterModal();
                }}
              >
                <label className={`${styles.fieldWrap} ${styles.registerFullRow}`}>
                  <span>Alumno</span>
                  <input type="text" placeholder="Ej. Mariano Tarditi" />
                </label>

                <label className={styles.fieldWrap}>
                  <span>Email</span>
                  <input type="email" placeholder="alumno@email.com" />
                </label>

                <label className={styles.fieldWrap}>
                  <span>Teléfono</span>
                  <input type="tel" placeholder="+54 9 11 1234 5678" />
                </label>

                <label className={styles.fieldWrap}>
                  <span>Monto</span>
                  <div className={styles.moneyInputWrap}>
                    <i>$</i>
                    <input type="text" placeholder="45.000" />
                  </div>
                </label>

                <label className={styles.fieldWrap}>
                  <span>Próximo vencimiento</span>
                  <input type="text" placeholder="DD/MM/AAAA" />
                </label>

                <label className={styles.fieldWrap}>
                  <span>Días a vencer</span>
                  <input type="number" min={0} placeholder="3" />
                </label>

                <label className={styles.fieldWrap}>
                  <span>Estado</span>
                  <div className={styles.selectWrap}>
                    <select defaultValue="Activo" aria-label="Estado del pago">
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                    <MaterialSymbol name="expand_more" className={styles.selectIcon} weight={500} opticalSize={18} />
                  </div>
                </label>
              </form>
            </div>

            <footer className={styles.registerFooter}>
              <button type="button" className={styles.modalCancelGhostButton} onClick={closeRegisterModal}>
                Cancelar
              </button>
              <button type="submit" className={styles.modalConfirmButton} form="register-payment-form">
                <MaterialSymbol name="save" className={styles.confirmIcon} fill={1} weight={500} opticalSize={18} />
                Registrar pago
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}
