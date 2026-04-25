"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

import styles from "@/app/(private)/pagos/pagos.module.css";
import {
  buildRegisterWarningPayload,
  buildInitials,
  editPaymentRuntime,
  fetchPaymentConfigRuntime,
  fetchPaymentsDashboard,
  formatCurrencyARS,
  formatDateEsAr,
  mapDaysToExpireLabel,
  mapRowStatusLabel,
  registerPaymentRuntime,
  runRegisterWarningDecision,
  type RegisterPaymentInput,
  type RegisterWarningPayload,
  updatePaymentConfigRuntime,
  type PaymentView,
} from "@/app/(private)/pagos/runtime";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";

type DashboardRow = {
  studentProfileId: string;
  fullName: string;
  email: string;
  phone: string;
  amountInCents: number;
  startDate: string;
  dueDate: string;
  daysToExpire: number;
  paymentStatus: "CURRENT" | "DUE_SOON" | "OVERDUE";
  statusLabel: string;
  initials: string;
};

const PAYMENT_VIEWS: Array<{ value: PaymentView; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "DUE_TODAY", label: "Vence hoy" },
  { value: "DUE_THIS_WEEK", label: "Vence esta semana" },
  { value: "OVERDUE", label: "Vencidos" },
];

const toIsoLocalDate = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatAmountInput = (value: string) => value.replace(/[^0-9]/g, "");

const amountInputToCents = (value: string) => {
  const normalized = Number.parseInt(value, 10);

  if (!Number.isFinite(normalized) || normalized <= 0) {
    return null;
  }

  return normalized * 100;
};

const centsToAmountInput = (valueInCents: number) => String(Math.round(valueInCents / 100));

export default function PagosPage() {
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<PaymentView>("ALL");
  const [query, setQuery] = useState("");

  const [cards, setCards] = useState({
    collectedCount: 0,
    collectedAmountInCents: 0,
    dueSoonCount: 0,
    overdueCount: 0,
    overdueAmountInCents: 0,
    estimatedTotalInCents: 0,
    studentsInEstimatedTotal: 0,
  });

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerStudentProfileId, setRegisterStudentProfileId] = useState("");
  const [registerAmount, setRegisterAmount] = useState("");
  const [registerPaymentDate, setRegisterPaymentDate] = useState(toIsoLocalDate(new Date()));
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerWarningPayload, setRegisterWarningPayload] = useState<RegisterWarningPayload | null>(null);

  const [editingPayment, setEditingPayment] = useState<DashboardRow | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [globalAmountDraft, setGlobalAmountDraft] = useState("");
  const [globalAmountError, setGlobalAmountError] = useState<string | null>(null);
  const [isSavingGlobalAmount, setIsSavingGlobalAmount] = useState(false);

  const loadDashboard = async (selectedView: PaymentView, selectedQuery: string) => {
    try {
      setLoading(true);
      setError(null);

      const payload = await fetchPaymentsDashboard(fetch, {
        view: selectedView,
        query: selectedQuery,
      });

      setCards(payload.cards);
      setRows(
        payload.rows.map((row) => ({
          studentProfileId: row.studentProfileId,
          fullName: row.fullName,
          email: row.email,
          phone: row.phone ?? "",
          amountInCents: row.amountInCents,
          startDate: row.startDate,
          dueDate: row.dueDate,
          daysToExpire: row.daysToExpire,
          paymentStatus: row.paymentStatus,
          statusLabel: mapRowStatusLabel(row.studentStatus, row.paymentStatus),
          initials: buildInitials(row.fullName),
        }))
      );

      setGlobalAmountDraft((current) =>
        current.length > 0
          ? current
          : centsToAmountInput(payload.config.defaultMonthlyAmountInCents)
      );
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar la vista de pagos.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadDashboard(view, query);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [view, query]);

  useEffect(() => {
    let cancelled = false;

    const loadGlobalConfig = async () => {
      try {
        const config = await fetchPaymentConfigRuntime(fetch);

        if (cancelled) {
          return;
        }

        setGlobalAmountDraft(centsToAmountInput(config.defaultMonthlyAmountInCents));
        setGlobalAmountError(null);
      } catch (configError) {
        if (cancelled) {
          return;
        }

        setGlobalAmountError(
          configError instanceof Error
            ? configError.message
            : "No se pudo cargar la configuración general de pagos."
        );
      }
    };

    void loadGlobalConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveGlobalAmount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextAmountInCents = amountInputToCents(globalAmountDraft);

    if (!nextAmountInCents) {
      setGlobalAmountError("Ingresá un monto mensual global válido mayor a 0.");
      return;
    }

    try {
      setIsSavingGlobalAmount(true);
      setGlobalAmountError(null);

      const updatedConfig = await updatePaymentConfigRuntime(fetch, {
        defaultMonthlyAmountInCents: nextAmountInCents,
      });

      setGlobalAmountDraft(centsToAmountInput(updatedConfig.defaultMonthlyAmountInCents));
    } catch (configError) {
      setGlobalAmountError(
        configError instanceof Error
          ? configError.message
          : "No se pudo guardar la configuración general de pagos."
      );
    } finally {
      setIsSavingGlobalAmount(false);
    }
  };

  const selectedRegisterRow = useMemo(
    () => rows.find((row) => row.studentProfileId === registerStudentProfileId) ?? null,
    [registerStudentProfileId, rows]
  );

  const closeRegisterModal = () => {
    if (isRegistering) {
      return;
    }

    setIsRegisterModalOpen(false);
    setRegisterStudentProfileId("");
    setRegisterAmount("");
    setRegisterPaymentDate(toIsoLocalDate(new Date()));
    setRegisterError(null);
    setRegisterWarningPayload(null);
  };

  const openRegisterModal = (row?: DashboardRow) => {
    setRegisterStudentProfileId(row?.studentProfileId ?? "");
    setRegisterAmount(row ? String(Math.round(row.amountInCents / 100)) : "");
    setRegisterPaymentDate(toIsoLocalDate(new Date()));
    setRegisterError(null);
    setRegisterWarningPayload(null);
    setIsRegisterModalOpen(true);
  };

  const submitRegisterPayment = async (payload: RegisterPaymentInput) => {
    try {
      setIsRegistering(true);
      setRegisterError(null);

      await registerPaymentRuntime(fetch, payload);

      closeRegisterModal();
      await loadDashboard(view, query);
    } catch (submitError) {
      setRegisterError(submitError instanceof Error ? submitError.message : "No se pudo registrar el pago.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!registerStudentProfileId) {
      setRegisterError("Seleccioná un alumno para registrar el pago.");
      return;
    }

    const amountInCents = amountInputToCents(registerAmount);

    if (!amountInCents) {
      setRegisterError("Ingresá un monto válido mayor a 0.");
      return;
    }

    if (!registerPaymentDate) {
      setRegisterError("Ingresá una fecha de pago válida.");
      return;
    }

    const selectedRow = rows.find((row) => row.studentProfileId === registerStudentProfileId) ?? null;
    const registerPayload: RegisterPaymentInput = {
      studentProfileId: registerStudentProfileId,
      amountInCents,
      paymentDate: registerPaymentDate,
    };
    const warningPayload = buildRegisterWarningPayload(selectedRow, registerPayload);

    if (warningPayload) {
      setRegisterWarningPayload(warningPayload);
      return;
    }

    await submitRegisterPayment(registerPayload);
  };

  const handleConfirmRegisterWarning = async () => {
    const warningPayload = registerWarningPayload;

    setRegisterWarningPayload(null);

    await runRegisterWarningDecision(
      {
        decision: "confirm",
        warningPayload,
      },
      submitRegisterPayment
    );
  };

  const closeRegisterWarning = () => {
    if (isRegistering) {
      return;
    }

    setRegisterWarningPayload(null);
  };

  const openEditModal = (row: DashboardRow) => {
    setEditingPayment(row);
    setEditStartDate(toIsoLocalDate(new Date(row.startDate)));
    setEditAmount(String(Math.round(row.amountInCents / 100)));
    setEditError(null);
  };

  const closeEditModal = () => {
    if (isEditing) {
      return;
    }

    setEditingPayment(null);
    setEditStartDate("");
    setEditAmount("");
    setEditError(null);
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingPayment) {
      return;
    }

    const amountInCents = amountInputToCents(editAmount);

    if (!amountInCents) {
      setEditError("Ingresá un monto válido mayor a 0.");
      return;
    }

    if (!editStartDate) {
      setEditError("Ingresá una fecha de inicio válida.");
      return;
    }

    try {
      setIsEditing(true);
      setEditError(null);

      await editPaymentRuntime(fetch, {
        studentProfileId: editingPayment.studentProfileId,
        amountInCents,
        startDate: editStartDate,
      });

      closeEditModal();
      await loadDashboard(view, query);
    } catch (submitError) {
      setEditError(submitError instanceof Error ? submitError.message : "No se pudo editar el pago.");
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <section className={styles.page}>
      <PrivateBreadcrumb current="Pagos" />
      <PrivateTopbar
        title="Gestión de Pagos"
        subtitle="Visualiza estado financiero, vencimientos y recordatorios en una vista operativa para sostener ingresos y adherencia."
      />

      <div className={styles.content}>
        <section className={styles.metrics}>
          <article className={styles.metricCard}>
            <div className={styles.metricGlow} aria-hidden="true" />
            <div className={styles.metricTop}>
              <span className={`${styles.metricIcon} ${styles.metricIcon_primary}`}>
                <MaterialSymbol name="payments" className={styles.metricSymbol} weight={500} opticalSize={20} />
              </span>
            </div>
            <h3 className={styles.metricLabel}>Pagos Cobrados</h3>
            <p className={styles.metricValue}>
              {cards.collectedCount} <span className={styles.metricDetail_primary}>{formatCurrencyARS(cards.collectedAmountInCents)}</span>
            </p>
          </article>

          <article className={styles.metricCard}>
            <div className={styles.metricGlow} aria-hidden="true" />
            <div className={styles.metricTop}>
              <span className={`${styles.metricIcon} ${styles.metricIcon_warning}`}>
                <MaterialSymbol name="warning" className={styles.metricSymbol} weight={500} opticalSize={20} />
              </span>
            </div>
            <h3 className={styles.metricLabel}>Vence Pronto</h3>
            <p className={styles.metricValue}>
              {cards.dueSoonCount} <span className={styles.metricDetail_warning}>Próximos 3 días</span>
            </p>
          </article>

          <article className={styles.metricCard}>
            <div className={styles.metricGlow} aria-hidden="true" />
            <div className={styles.metricTop}>
              <span className={`${styles.metricIcon} ${styles.metricIcon_error}`}>
                <MaterialSymbol name="error" className={styles.metricSymbol} weight={500} opticalSize={20} />
              </span>
            </div>
            <h3 className={styles.metricLabel}>Vencidos</h3>
            <p className={styles.metricValue}>
              {cards.overdueCount} <span className={styles.metricDetail_error}>Pendiente: {formatCurrencyARS(cards.overdueAmountInCents)}</span>
            </p>
          </article>

          <article className={styles.metricCard}>
            <div className={styles.metricGlow} aria-hidden="true" />
            <div className={styles.metricTop}>
              <span className={`${styles.metricIcon} ${styles.metricIcon_monitor}`}>
                <MaterialSymbol name="monitoring" className={styles.metricSymbol} weight={500} opticalSize={20} />
              </span>
            </div>
            <h3 className={styles.metricLabel}>Total Estimado</h3>
            <p className={styles.metricValue}>
              {formatCurrencyARS(cards.estimatedTotalInCents)} <span className={styles.metricDetail_monitor}>Alumnos: {cards.studentsInEstimatedTotal}</span>
            </p>
          </article>
        </section>

        <section className={styles.tableSection}>
          <form className={styles.configSection} onSubmit={handleSaveGlobalAmount}>
            <div className={styles.configHeaderRow}>
              <h3>Configuración general</h3>
              <p>Este monto se usa por defecto para nuevos ciclos de pago y nuevos alumnos.</p>
            </div>
            <div className={styles.configControls}>
              <label className={styles.fieldWrap}>
                <span>Monto mensual global</span>
                <div className={styles.moneyInputWrap}>
                  <i>$</i>
                  <input
                    type="text"
                    value={globalAmountDraft}
                    onChange={(event) => {
                      setGlobalAmountDraft(formatAmountInput(event.target.value));
                      if (globalAmountError) {
                        setGlobalAmountError(null);
                      }
                    }}
                    placeholder="30000"
                    disabled={isSavingGlobalAmount}
                  />
                </div>
              </label>

              <button
                type="submit"
                className={`${styles.createButton} ${styles.configSaveButton}`}
                disabled={isSavingGlobalAmount}
              >
                {isSavingGlobalAmount ? "Guardando..." : "Guardar"}
              </button>
            </div>
            {globalAmountError ? <p className={styles.subtleText}>{globalAmountError}</p> : null}
          </form>

          <div className={styles.tableToolbar}>
            <label className={styles.searchWrap}>
              <MaterialSymbol name="search" className={styles.searchIcon} weight={420} opticalSize={18} />
              <input
                type="search"
                placeholder="Filtrar por nombre o email..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            <div className={styles.tableActions}>
              <div className={`${styles.selectWrap} ${styles.paymentFilterWrap}`}>
                <select value={view} onChange={(event) => setView(event.target.value as PaymentView)} aria-label="Filtro de pagos">
                  {PAYMENT_VIEWS.map((paymentView) => (
                    <option key={paymentView.value} value={paymentView.value}>
                      {paymentView.label}
                    </option>
                  ))}
                </select>
                <MaterialSymbol name="expand_more" className={styles.selectIcon} weight={500} opticalSize={18} />
              </div>
              <button type="button" className={styles.createButton} onClick={() => openRegisterModal()}>
                Registrar pago
              </button>
            </div>
          </div>

          {error ? <p className={styles.subtleText}>{error}</p> : null}

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
                  {loading ? (
                    <tr>
                      <td colSpan={8} className={styles.subtleText}>
                        Cargando pagos...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={styles.subtleText}>
                        No se encontraron pagos para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.studentProfileId}>
                        <td>
                          <div className={styles.studentWrap}>
                            <span className={styles.initials}>{row.initials}</span>
                            <span className={styles.studentName}>{row.fullName}</span>
                          </div>
                        </td>
                        <td>
                          <span className={styles.subtleText}>{row.email}</span>
                        </td>
                        <td>
                          <span className={styles.subtleText}>{row.phone || "-"}</span>
                        </td>
                        <td>
                          <span className={styles.amount}>{formatCurrencyARS(row.amountInCents)}</span>
                        </td>
                        <td>
                          <span className={styles.subtleText}>{formatDateEsAr(row.dueDate)}</span>
                        </td>
                        <td>
                          <span className={styles.subtleText}>{mapDaysToExpireLabel(row.daysToExpire)}</span>
                        </td>
                        <td>
                          <span className={styles.statusWrap}>
                            <span className={styles.statusDot} aria-hidden="true" />
                            <span className={styles.statusText}>{row.statusLabel}</span>
                          </span>
                        </td>
                        <td className={styles.alignRight}>
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={styles.rowButton}
                              aria-label={`Registrar pago de ${row.fullName}`}
                              onClick={() => openRegisterModal(row)}
                            >
                              <MaterialSymbol name="payments" className={styles.rowActionIcon} weight={500} opticalSize={20} />
                            </button>
                            <button
                              type="button"
                              className={styles.rowButton}
                              aria-label={`Editar pago de ${row.fullName}`}
                              onClick={() => openEditModal(row)}
                            >
                              <MaterialSymbol name="edit" className={styles.rowActionIcon} weight={500} opticalSize={20} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {isRegisterModalOpen ? (
        <div className={styles.modalOverlay} role="presentation" onClick={closeRegisterModal}>
          <div className={styles.registerModal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className={styles.registerHeader}>
              <div>
                <div className={styles.registerTitleRow}>
                  <h2>Registrar Pago</h2>
                </div>
                <p>Registrá un cobro y renová el ciclo del alumno.</p>
              </div>
              <button type="button" className={styles.modalCloseButton} aria-label="Cerrar" onClick={closeRegisterModal}>
                <MaterialSymbol name="close" className={styles.modalCloseIcon} weight={500} opticalSize={22} />
              </button>
            </header>

            <div className={styles.registerBody}>
              <form id="register-payment-form" className={styles.registerForm} onSubmit={handleRegisterSubmit}>
                <label className={`${styles.fieldWrap} ${styles.registerFullRow}`}>
                  <span>Alumno</span>
                  <div className={styles.selectWrap}>
                    <select
                      value={registerStudentProfileId}
                      onChange={(event) => setRegisterStudentProfileId(event.target.value)}
                      disabled={isRegistering}
                    >
                      <option value="">Seleccionar alumno</option>
                      {rows.map((row) => (
                        <option key={row.studentProfileId} value={row.studentProfileId}>
                          {row.fullName}
                        </option>
                      ))}
                    </select>
                    <MaterialSymbol name="expand_more" className={styles.selectIcon} weight={500} opticalSize={18} />
                  </div>
                </label>

                <label className={styles.fieldWrap}>
                  <span>Monto (ARS)</span>
                  <div className={styles.moneyInputWrap}>
                    <i>$</i>
                    <input
                      type="text"
                      value={registerAmount}
                      onChange={(event) => setRegisterAmount(formatAmountInput(event.target.value))}
                      placeholder="30000"
                      disabled={isRegistering}
                    />
                  </div>
                </label>

                <label className={styles.fieldWrap}>
                  <span>Fecha de pago</span>
                  <input
                    type="date"
                    value={registerPaymentDate}
                    onChange={(event) => setRegisterPaymentDate(event.target.value)}
                    disabled={isRegistering}
                  />
                </label>

                {selectedRegisterRow ? (
                  <label className={`${styles.fieldWrap} ${styles.registerFullRow}`}>
                    <span>Próximo vencimiento estimado</span>
                    <input type="text" value={formatDateEsAr(new Date(registerPaymentDate || selectedRegisterRow.startDate))} disabled />
                  </label>
                ) : null}

                {registerError ? <p className={styles.subtleText}>{registerError}</p> : null}
              </form>
            </div>

            <footer className={styles.registerFooter}>
              <button type="button" className={styles.modalCancelGhostButton} onClick={closeRegisterModal} disabled={isRegistering}>
                Cancelar
              </button>
              <button type="submit" className={styles.modalConfirmButton} form="register-payment-form" disabled={isRegistering}>
                <MaterialSymbol name="save" className={styles.confirmIcon} fill={1} weight={500} opticalSize={18} />
                {isRegistering ? "Registrando..." : "Registrar pago"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {registerWarningPayload ? (
        <div className={styles.modalOverlay} role="presentation" onClick={closeRegisterWarning}>
          <div className={styles.editModal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className={styles.editHeader}>
              <div>
                <div className={styles.editTitleRow}>
                  <MaterialSymbol name="warning" className={styles.editSectionIcon} weight={500} opticalSize={20} />
                  <h2>Confirmar registro anticipado</h2>
                </div>
                <p>
                  {registerWarningPayload.fullName} está al día y todavía le quedan {registerWarningPayload.daysToExpire} días para
                  el próximo vencimiento.
                </p>
                <p>
                  Si registrás este pago ahora, el ciclo mensual se reinicia desde {formatDateEsAr(registerWarningPayload.paymentDate)}.
                </p>
              </div>
              <button type="button" className={styles.modalCloseButton} aria-label="Cerrar" onClick={closeRegisterWarning}>
                <MaterialSymbol name="close" className={styles.modalCloseIcon} weight={500} opticalSize={22} />
              </button>
            </header>

            <footer className={styles.editFooter}>
              <button
                type="button"
                className={styles.modalCancelGhostButton}
                onClick={closeRegisterWarning}
                disabled={isRegistering}
              >
                Cancelar
              </button>
              <button type="button" className={styles.modalConfirmButton} onClick={handleConfirmRegisterWarning} disabled={isRegistering}>
                <MaterialSymbol name="payments" className={styles.confirmIcon} fill={1} weight={500} opticalSize={18} />
                {isRegistering ? "Registrando..." : "Registrar igual"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {editingPayment ? (
        <div className={styles.modalOverlay} role="presentation" onClick={closeEditModal}>
          <div className={styles.editModal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className={styles.editHeader}>
              <div>
                <div className={styles.editTitleRow}>
                  <MaterialSymbol name="edit_note" className={styles.editSectionIcon} weight={500} opticalSize={20} />
                  <h2>Editar Pago</h2>
                </div>
                <p>Modificá el estado actual del ciclo sin crear historial.</p>
              </div>
              <button type="button" className={styles.modalCloseButton} aria-label="Cerrar" onClick={closeEditModal}>
                <MaterialSymbol name="close" className={styles.modalCloseIcon} weight={500} opticalSize={22} />
              </button>
            </header>

            <div className={styles.editBody}>
              <form id="edit-payment-form" className={styles.editForm} onSubmit={handleEditSubmit}>
                <label className={`${styles.fieldWrap} ${styles.editFullRow}`}>
                  <span>Alumno</span>
                  <input type="text" value={editingPayment.fullName} disabled />
                </label>

                <label className={styles.fieldWrap}>
                  <span>Monto (ARS)</span>
                  <div className={styles.moneyInputWrap}>
                    <i>$</i>
                    <input
                      type="text"
                      value={editAmount}
                      onChange={(event) => setEditAmount(formatAmountInput(event.target.value))}
                      placeholder="30000"
                      disabled={isEditing}
                    />
                  </div>
                </label>

                <label className={styles.fieldWrap}>
                  <span>Fecha de inicio</span>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(event) => setEditStartDate(event.target.value)}
                    disabled={isEditing}
                  />
                </label>

                {editError ? <p className={styles.subtleText}>{editError}</p> : null}
              </form>
            </div>

            <footer className={styles.editFooter}>
              <button type="button" className={styles.modalCancelGhostButton} onClick={closeEditModal} disabled={isEditing}>
                Cancelar
              </button>
              <button type="submit" className={styles.modalConfirmButton} form="edit-payment-form" disabled={isEditing}>
                <MaterialSymbol name="save" className={styles.confirmIcon} fill={1} weight={500} opticalSize={18} />
                {isEditing ? "Guardando..." : "Guardar cambios"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}
