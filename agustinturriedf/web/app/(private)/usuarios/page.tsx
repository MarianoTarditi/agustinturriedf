"use client";

import { type FormEvent, type MouseEvent, useEffect, useState } from "react";
import styles from "@/app/(private)/usuarios/usuarios.module.css";
import { z } from "zod";
import { DestructiveConfirmationModal } from "@/components/destructive-confirmation-modal";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";
import {
  createStudentRuntime,
  deleteUserRuntime,
  fetchPaymentConfigRuntime,
  fetchUsersRuntime,
  type UserRow,
} from "@/app/(private)/usuarios/runtime";

type ModalType = "create" | "detail" | "edit" | "delete";

type CreateStudentFieldKey =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "birthDate"
  | "initialPaymentStartDate"
  | "gender"
  | "heightCm"
  | "weightKg";

type ProfileGender = "MALE" | "FEMALE" | "NON_BINARY" | "OTHER";

type CreateStudentValidationErrors = Partial<
  Record<CreateStudentFieldKey, string>
>;

type CreateStudentFormState = Record<CreateStudentFieldKey, string>;

const emptyCreateStudentForm: CreateStudentFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  birthDate: "",
  initialPaymentStartDate: "",
  gender: "",
  heightCm: "",
  weightKg: "",
};

const toIsoLocalDate = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createDefaultCreateStudentForm = (): CreateStudentFormState => ({
  ...emptyCreateStudentForm,
  initialPaymentStartDate: toIsoLocalDate(new Date()),
});

const formatAmountPesos = (amountInCents: number | null) => {
  if (amountInCents === null) {
    return "";
  }

  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountInCents / 100);
};

const parseBirthDateInput = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const isoMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    const [, yearRaw, monthRaw, dayRaw] = isoMatch;
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));

    const isValidIsoDate =
      parsedDate.getUTCFullYear() === year &&
      parsedDate.getUTCMonth() + 1 === month &&
      parsedDate.getUTCDate() === day;

    return isValidIsoDate ? parsedDate : null;
  }

  const localMatch = trimmedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!localMatch) {
    return null;
  }

  const [, dayRaw, monthRaw, yearRaw] = localMatch;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  const isValidLocalDate =
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() + 1 === month &&
    parsedDate.getUTCDate() === day;

  return isValidLocalDate ? parsedDate : null;
};

const createStudentValidationSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres."),
    lastName: z
      .string()
      .trim()
      .min(2, "El apellido debe tener al menos 2 caracteres."),
    email: z.string().trim().toLowerCase().email("Ingresá un email válido."),
    phone: z
      .string()
      .trim()
      .min(6, "Ingresá un celular válido.")
      .regex(/^[\d+()\-\s.]+$/, "Ingresá un celular válido.")
      .refine(
        (value) => value.replace(/\D/g, "").length >= 6,
        "Ingresá un celular válido.",
      ),
    birthDate: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) => !value || parseBirthDateInput(value) !== null,
        "Ingresá una fecha válida (DD/MM/AAAA).",
      )
      .refine((value) => {
        if (!value) return true;

        const parsedDate = parseBirthDateInput(value);
        if (!parsedDate) return false;

        const now = new Date();
        const todayUtc = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
        );
        return parsedDate <= todayUtc;
      }, "La fecha de nacimiento no puede ser futura."),
    initialPaymentStartDate: z
      .string()
      .trim()
      .min(1, "La fecha de inicio inicial es obligatoria.")
      .refine(
        (value) => parseBirthDateInput(value) !== null,
        "Ingresá una fecha válida (DD/MM/AAAA).",
      ),
    gender: z.string().trim().optional(),
    heightCm: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) => !value || /^\d+$/.test(value),
        "La altura debe ser un número entero.",
      )
      .refine((value) => {
        if (!value) return true;
        const parsed = Number.parseInt(value, 10);
        return parsed >= 100 && parsed <= 250;
      }, "La altura debe estar entre 100 y 250 cm."),
    weightKg: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) => !value || /^\d+$/.test(value),
        "El peso debe ser un número entero.",
      )
      .refine((value) => {
        if (!value) return true;
        const parsed = Number.parseInt(value, 10);
        return parsed >= 30 && parsed <= 350;
      }, "El peso debe estar entre 30 y 350 kg."),
  })
  .superRefine((value, context) => {
    const hasGender = value.gender && value.gender.length > 0;

    if (!hasGender) {
      return;
    }

    const allowedGenders = new Set<ProfileGender>([
      "MALE",
      "FEMALE",
      "NON_BINARY",
      "OTHER",
    ]);

    if (!allowedGenders.has(value.gender as ProfileGender)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gender"],
        message: "Seleccioná un género válido.",
      });
    }
  });

const toApiBirthDate = (value: string) => {
  const parsedDate = parseBirthDateInput(value);

  if (!parsedDate) {
    return null;
  }

  return parsedDate.toISOString().slice(0, 10);
};

function DotIcon() {
  return <span className={styles.dot} aria-hidden="true" />;
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType | null>(null);
  const [activeUser, setActiveUser] = useState<UserRow | null>(null);
  const [openActionsForUser, setOpenActionsForUser] = useState<string | null>(
    null,
  );
  const [createStudentForm, setCreateStudentForm] =
    useState<CreateStudentFormState>(createDefaultCreateStudentForm);
  const [createStudentErrors, setCreateStudentErrors] =
    useState<CreateStudentValidationErrors>({});
  const [createStudentSubmitError, setCreateStudentSubmitError] = useState<
    string | null
  >(null);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);
  const [defaultMonthlyAmountInCents, setDefaultMonthlyAmountInCents] = useState<number | null>(null);
  const [paymentConfigError, setPaymentConfigError] = useState<string | null>(null);

  const resetCreateStudentModalState = () => {
    setCreateStudentForm(createDefaultCreateStudentForm());
    setCreateStudentErrors({});
    setCreateStudentSubmitError(null);
    setIsCreatingStudent(false);
  };

  const closeModal = () => {
    if (isCreatingStudent || isDeletingUser) return;

    if (activeModal === "create") {
      resetCreateStudentModalState();
    }

    if (activeModal === "delete") {
      setDeleteUserError(null);
      setActiveUser(null);
    }

    setActiveModal(null);
  };

  const openUserModal = (
    modal: Exclude<ModalType, "create">,
    user: UserRow,
  ) => {
    setDeleteUserError(null);
    setActiveUser(user);
    setOpenActionsForUser(null);
    setActiveModal(modal);
  };

  const handleDeleteUserConfirm = async () => {
    if (!activeUser || isDeletingUser) {
      return;
    }

    const userId = activeUser.id;

    try {
      setIsDeletingUser(true);
      setDeleteUserError(null);

      await deleteUserRuntime(fetch, userId);

      setUsers((current) => current.filter((user) => user.id !== userId));
      setOpenActionsForUser(null);
      setActiveUser(null);
      setActiveModal(null);
    } catch (error) {
      setDeleteUserError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el usuario.",
      );
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleCreateStudentFieldChange = (
    field: CreateStudentFieldKey,
    value: string,
  ) => {
    setCreateStudentForm((current) => ({ ...current, [field]: value }));

    setCreateStudentErrors((current) => {
      if (!current[field]) return current;

      const { [field]: _removedError, ...rest } = current;
      return rest;
    });
  };

  const handleCreateStudentSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const validation =
      createStudentValidationSchema.safeParse(createStudentForm);

    if (!validation.success) {
      const nextErrors: CreateStudentValidationErrors = {};

      for (const issue of validation.error.issues) {
        const field = issue.path[0];
        if (typeof field !== "string") continue;

        if (!(field in nextErrors)) {
          nextErrors[field as CreateStudentFieldKey] = issue.message;
        }
      }

      setCreateStudentErrors(nextErrors);
      setCreateStudentSubmitError(null);
      return;
    }

    const trainerCandidate = users.find((user) => user.role === "trainer");

    if (!trainerCandidate) {
      setCreateStudentSubmitError(
        "No hay entrenadores disponibles para asignar al alumno.",
      );
      return;
    }

    try {
      setIsCreatingStudent(true);
      setCreateStudentSubmitError(null);

      const createdStudent = await createStudentRuntime(fetch, {
        firstName: validation.data.firstName.trim(),
        lastName: validation.data.lastName.trim(),
        email: validation.data.email.trim().toLowerCase(),
        phone: validation.data.phone.trim(),
        birthDate: validation.data.birthDate
          ? toApiBirthDate(validation.data.birthDate)
          : null,
        gender: validation.data.gender
          ? (validation.data.gender as ProfileGender)
          : null,
        heightCm: validation.data.heightCm
          ? Number.parseInt(validation.data.heightCm, 10)
          : null,
        weightKg: validation.data.weightKg
          ? Number.parseInt(validation.data.weightKg, 10)
          : null,
        initialPaymentStartDate: validation.data.initialPaymentStartDate
          ? toApiBirthDate(validation.data.initialPaymentStartDate)
          : null,
        role: "STUDENT",
        trainerId: trainerCandidate.id,
        studentStatus: "ACTIVE",
      });

      setUsers((current) => [
        createdStudent,
        ...current.filter((user) => user.id !== createdStudent.id),
      ]);
      resetCreateStudentModalState();
      setActiveModal(null);
    } catch (error) {
      setCreateStudentSubmitError(
        error instanceof Error ? error.message : "No se pudo crear el alumno.",
      );
    } finally {
      setIsCreatingStudent(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        setUsersError(null);
        setPaymentConfigError(null);

        if (!cancelled) {
          const [usersRows, paymentConfig] = await Promise.all([
            fetchUsersRuntime(fetch),
            fetchPaymentConfigRuntime(fetch),
          ]);

          setUsers(usersRows);
          setDefaultMonthlyAmountInCents(paymentConfig.defaultMonthlyAmountInCents);
        }
      } catch (error) {
        if (!cancelled) {
          const resolvedMessage =
            error instanceof Error
              ? error.message
              : "No se pudo cargar la lista de usuarios.";

          setUsersError(resolvedMessage);
          setPaymentConfigError(resolvedMessage);
          setUsers([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingUsers(false);
        }
      }
    };

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeStudents = users.filter(
    (user) => user.role === "student" && user.status === "Activo",
  ).length;
  const inactiveStudents = users.filter(
    (user) => user.role === "student" && user.status !== "Activo",
  ).length;
  const managementUsers = users.filter(
    (user) => user.role === "admin" || user.role === "trainer",
  ).length;
  const totalUsers = users.length;

  const closeActionsIfClickedOutside = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;

    if (!target.closest(`.${styles.rowActionsWrap}`)) {
      setOpenActionsForUser(null);
    }
  };

  useEffect(() => {
    if (!activeModal) return;

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [activeModal, isCreatingStudent, isDeletingUser]);

  return (
    <section className={styles.page} onClick={closeActionsIfClickedOutside}>
      <PrivateBreadcrumb current="Usuarios" />
      <PrivateTopbar
        title="Gestión de Alumnos"
        subtitle="Controla perfiles, roles y estado operativo de la base para mantener seguimiento preciso y comunicación efectiva."
      />

      <div className={styles.content}>
        <section className={styles.metrics}>
          <article className={styles.metricCard}>
            <div className={styles.metricGlow} aria-hidden="true" />
            <div className={styles.metricTop}>
              <span className={styles.metricIcon}>
                <MaterialSymbol
                  name="person_check"
                  className={styles.metricSymbol}
                  weight={500}
                  opticalSize={20}
                />
              </span>
              <span className={styles.metricBadge}>Tiempo real</span>
            </div>
            <h3 className={styles.metricLabel}>Alumnos activos</h3>
            <p className={styles.metricValue}>
              {activeStudents}{" "}
              <span>
                {inactiveStudents} inactivo{inactiveStudents === 1 ? "" : "s"}
              </span>
            </p>
          </article>

          <article className={styles.metricCard}>
            <div className={styles.metricTop}>
              <span className={styles.metricIconSecondary}>
                <MaterialSymbol
                  name="admin_panel_settings"
                  className={styles.metricSymbol}
                  weight={500}
                  opticalSize={20}
                />
              </span>
            </div>
            <h3 className={styles.metricLabel}>Equipo de gestión</h3>
            <p className={styles.metricValue}>
              {managementUsers} <span>Admins y trainers</span>
            </p>
          </article>

          <article className={styles.metricCard}>
            <div className={styles.metricTop}>
              <span className={styles.metricIconTertiary}>
                <MaterialSymbol
                  name="database"
                  className={styles.metricSymbol}
                  weight={500}
                  opticalSize={20}
                />
              </span>
            </div>
            <h3 className={styles.metricLabel}>Base total</h3>
            <p className={styles.metricValue}>
              {totalUsers} <span>Usuarios registrados</span>
            </p>
          </article>
        </section>

        <section className={styles.tableSection}>
          <div className={styles.tableToolbar}>
            <div className={styles.tableTitleRow}>
              <h3>{totalUsers} usuarios totales</h3>
              <DotIcon />
              <span>Lista actualizada</span>
            </div>

            <div className={styles.tableActions}>
              <button type="button" className={styles.sortButton}>
                <MaterialSymbol
                  name="sort"
                  className={styles.actionIcon}
                  weight={450}
                  opticalSize={20}
                />
                Ordenar vista
              </button>
              <button
                type="button"
                className={styles.createButton}
                onClick={() => {
                  setOpenActionsForUser(null);
                  resetCreateStudentModalState();
                  setActiveModal("create");
                }}
              >
                <MaterialSymbol
                  name="person_add"
                  className={styles.actionIcon}
                  fill={1}
                  weight={500}
                  opticalSize={20}
                />
                Crear alumno
              </button>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>Estado</th>
                  <th className={styles.alignRight}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr>
                    <td colSpan={6}>Cargando usuarios...</td>
                  </tr>
                ) : usersError ? (
                  <tr>
                    <td colSpan={6}>{usersError}</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No hay usuarios para mostrar.</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div
                          className={`${styles.avatarWrap} ${user.status === "Inactivo" ? styles.avatarInactive : ""}`}
                        >
                          <img
                            src={user.photo}
                            alt={user.name}
                            className={styles.userImage}
                          />
                        </div>
                      </td>
                      <td>
                        <span
                          className={`${styles.userName} ${user.status === "Inactivo" ? styles.userNameInactive : ""}`}
                        >
                          {user.name}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.userEmail} ${user.status === "Inactivo" ? styles.userEmailInactive : ""}`}
                        >
                          {user.email}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.roleChip} ${styles[`role_${user.role}`]}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={styles.statusWrap}>
                          <span
                            className={`${styles.statusDot} ${user.status === "Activo" ? styles.active : styles.inactive}`}
                          />
                          <span
                            className={
                              user.status === "Activo"
                                ? styles.statusActive
                                : styles.statusInactive
                            }
                          >
                            {user.status}
                          </span>
                        </span>
                      </td>
                      <td className={styles.alignRight}>
                        <div className={styles.rowActionsWrap}>
                          <button
                            className={styles.moreButton}
                            type="button"
                            aria-haspopup="menu"
                            aria-expanded={openActionsForUser === user.id}
                            aria-label={`Acciones para ${user.name}`}
                            onClick={() =>
                              setOpenActionsForUser((current) =>
                                current === user.id ? null : user.id,
                              )
                            }
                          >
                            <MaterialSymbol
                              name="more_vert"
                              className={styles.rowActionIcon}
                              weight={500}
                              opticalSize={20}
                            />
                          </button>

                          {openActionsForUser === user.id ? (
                            <div
                              className={styles.rowMenu}
                              role="menu"
                              aria-label={`Opciones para ${user.name}`}
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => openUserModal("detail", user)}
                              >
                                <MaterialSymbol
                                  name="visibility"
                                  className={styles.rowMenuIcon}
                                  weight={500}
                                  opticalSize={18}
                                />
                                Ver detalle
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => openUserModal("edit", user)}
                              >
                                <MaterialSymbol
                                  name="edit_note"
                                  className={styles.rowMenuIcon}
                                  weight={500}
                                  opticalSize={18}
                                />
                                Editar usuario
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => openUserModal("delete", user)}
                              >
                                <MaterialSymbol
                                  name="delete"
                                  className={`${styles.rowMenuIcon} ${styles.rowMenuIconDanger}`}
                                  weight={500}
                                  opticalSize={18}
                                />
                                Eliminar alumno
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <footer className={styles.pagination}>
              <p>Página 1 de 1</p>
              <div>
                <button type="button" disabled>
                  <MaterialSymbol
                    name="chevron_left"
                    className={styles.paginationIcon}
                    weight={500}
                    opticalSize={20}
                  />
                </button>
                <button type="button">
                  <MaterialSymbol
                    name="chevron_right"
                    className={styles.paginationIcon}
                    weight={500}
                    opticalSize={20}
                  />
                </button>
              </div>
            </footer>
          </div>
        </section>
      </div>

      {activeModal && activeModal !== "delete" ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={closeModal}
        >
          {activeModal === "create" ? (
            <div
              className={styles.createModal}
              role="dialog"
              aria-modal="true"
              aria-label="Crear alumno"
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.createModalBody}>
                <header className={styles.modalHeaderRow}>
                  <div>
                    <h2 className={styles.modalTitle}>Crear alumno</h2>
                    <p className={styles.modalDescription}>
                      Los usuarios Admin y trainer pueden dar de alta alumnos
                      desde esta seccion. El usuario accedera al sistema con su
                      <span className={styles.modalCodeLabel}>
                        {" "}
                        &quot;Email&quot;{" "}
                      </span>
                      y contraseña
                      <span className={styles.modalCodeLabel}>
                        {" "}
                        &quot;123456789&quot;
                      </span>
                      .
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.modalCloseButton}
                    aria-label="Cerrar modal"
                    onClick={closeModal}
                    disabled={isCreatingStudent}
                  >
                    <MaterialSymbol
                      name="close"
                      className={styles.modalCloseIcon}
                      weight={500}
                      opticalSize={22}
                    />
                  </button>
                </header>

                <form
                  className={styles.createForm}
                  onSubmit={handleCreateStudentSubmit}
                >
                  <div className={styles.formGroupGrid2}>
                    <label className={styles.fieldWrap}>
                      <span>Nombre *</span>
                      <input
                        type="text"
                        value={createStudentForm.firstName}
                        className={
                          createStudentErrors.firstName
                            ? styles.fieldInputError
                            : undefined
                        }
                        onChange={(event) =>
                          handleCreateStudentFieldChange(
                            "firstName",
                            event.target.value,
                          )
                        }
                        placeholder="Ej. Juan"
                        disabled={isCreatingStudent}
                      />
                      {createStudentErrors.firstName ? (
                        <small className={styles.fieldError}>
                          {createStudentErrors.firstName}
                        </small>
                      ) : null}
                    </label>
                    <label className={styles.fieldWrap}>
                      <span>Apellido *</span>
                      <input
                        type="text"
                        value={createStudentForm.lastName}
                        className={
                          createStudentErrors.lastName
                            ? styles.fieldInputError
                            : undefined
                        }
                        onChange={(event) =>
                          handleCreateStudentFieldChange(
                            "lastName",
                            event.target.value,
                          )
                        }
                        placeholder="Ej. Pérez"
                        disabled={isCreatingStudent}
                      />
                      {createStudentErrors.lastName ? (
                        <small className={styles.fieldError}>
                          {createStudentErrors.lastName}
                        </small>
                      ) : null}
                    </label>
                  </div>

                  <div className={styles.formGroupGrid2}>
                    <label className={styles.fieldWrap}>
                      <span>Email *</span>
                      <input
                        type="email"
                        value={createStudentForm.email}
                        className={
                          createStudentErrors.email
                            ? styles.fieldInputError
                            : undefined
                        }
                        onChange={(event) =>
                          handleCreateStudentFieldChange(
                            "email",
                            event.target.value,
                          )
                        }
                        placeholder="email@ejemplo.com"
                        disabled={isCreatingStudent}
                      />
                      {createStudentErrors.email ? (
                        <small className={styles.fieldError}>
                          {createStudentErrors.email}
                        </small>
                      ) : null}
                    </label>
                    <label className={styles.fieldWrap}>
                      <span>Celular *</span>
                      <input
                        type="tel"
                        value={createStudentForm.phone}
                        className={
                          createStudentErrors.phone
                            ? styles.fieldInputError
                            : undefined
                        }
                        onChange={(event) =>
                          handleCreateStudentFieldChange(
                            "phone",
                            event.target.value,
                          )
                        }
                        placeholder="+54 9 11 7152 8033"
                        disabled={isCreatingStudent}
                      />
                      {createStudentErrors.phone ? (
                        <small className={styles.fieldError}>
                          {createStudentErrors.phone}
                        </small>
                      ) : null}
                    </label>
                  </div>

                  <div className={styles.formGroupGrid3}>
                    <label className={styles.fieldWrap}>
                      <span>F. Nacimiento</span>
                      <input
                        type="text"
                        value={createStudentForm.birthDate}
                        className={
                          createStudentErrors.birthDate
                            ? styles.fieldInputError
                            : undefined
                        }
                        onChange={(event) =>
                          handleCreateStudentFieldChange(
                            "birthDate",
                            event.target.value,
                          )
                        }
                        placeholder="DD/MM/AAAA"
                        disabled={isCreatingStudent}
                      />
                      {createStudentErrors.birthDate ? (
                        <small className={styles.fieldError}>
                          {createStudentErrors.birthDate}
                        </small>
                      ) : null}
                    </label>
                    <label className={styles.fieldWrap}>
                      <span>Género</span>
                      <div
                        className={`${styles.selectWrap} ${createStudentErrors.gender ? styles.fieldInputError : ""}`}
                      >
                        <select
                          value={createStudentForm.gender}
                          aria-label="Género"
                          onChange={(event) =>
                            handleCreateStudentFieldChange(
                              "gender",
                              event.target.value,
                            )
                          }
                          disabled={isCreatingStudent}
                        >
                          <option value="" disabled>
                            Seleccionar
                          </option>
                          <option value="MALE">Masculino</option>
                          <option value="FEMALE">Femenino</option>
                          <option value="NON_BINARY">No binario</option>
                          <option value="OTHER">Otro</option>
                        </select>
                        <MaterialSymbol
                          name="expand_more"
                          className={styles.selectIcon}
                          weight={500}
                          opticalSize={18}
                        />
                      </div>
                      {createStudentErrors.gender ? (
                        <small className={styles.fieldError}>
                          {createStudentErrors.gender}
                        </small>
                      ) : null}
                    </label>
                    <div className={styles.subGrid2}>
                      <label className={styles.fieldWrap}>
                        <span>Altura</span>
                        <input
                          type="number"
                          value={createStudentForm.heightCm}
                          className={
                            createStudentErrors.heightCm
                              ? styles.fieldInputError
                              : undefined
                          }
                          onChange={(event) =>
                            handleCreateStudentFieldChange(
                              "heightCm",
                              event.target.value,
                            )
                          }
                          placeholder="cm"
                          disabled={isCreatingStudent}
                        />
                        {createStudentErrors.heightCm ? (
                          <small className={styles.fieldError}>
                            {createStudentErrors.heightCm}
                          </small>
                        ) : null}
                      </label>
                      <label className={styles.fieldWrap}>
                        <span>Peso</span>
                        <input
                          type="number"
                          value={createStudentForm.weightKg}
                          className={
                            createStudentErrors.weightKg
                              ? styles.fieldInputError
                              : undefined
                          }
                          onChange={(event) =>
                            handleCreateStudentFieldChange(
                              "weightKg",
                              event.target.value,
                            )
                          }
                          placeholder="kg"
                          disabled={isCreatingStudent}
                        />
                        {createStudentErrors.weightKg ? (
                          <small className={styles.fieldError}>
                            {createStudentErrors.weightKg}
                          </small>
                        ) : null}
                      </label>
                    </div>
                  </div>

                  <div className={styles.paymentSection}>
                    <div className={styles.paymentTitleRow}>
                      <MaterialSymbol
                        name="payments"
                        className={styles.paymentTitleIcon}
                        fill={1}
                        weight={500}
                        opticalSize={18}
                      />
                      <h4>Configuración inicial de pago</h4>
                    </div>
                    <div className={`${styles.formGroupGrid2} ${styles.paymentFieldsGrid}`}>
                      <label className={styles.fieldWrap}>
                        <span>Fecha de inicio inicial *</span>
                        <input
                          type="date"
                          value={createStudentForm.initialPaymentStartDate}
                          className={
                            createStudentErrors.initialPaymentStartDate
                              ? styles.fieldInputError
                              : undefined
                          }
                          onChange={(event) =>
                            handleCreateStudentFieldChange(
                              "initialPaymentStartDate",
                              event.target.value,
                            )
                          }
                          required
                          disabled={isCreatingStudent}
                        />
                        {createStudentErrors.initialPaymentStartDate ? (
                          <small className={styles.fieldError}>
                            {createStudentErrors.initialPaymentStartDate}
                          </small>
                        ) : (
                          <small>
                            Se usa para crear el primer ciclo de pago del alumno.
                          </small>
                        )}
                      </label>

                      <label className={`${styles.fieldWrap} ${styles.moneyField}`}>
                        <span>Monto</span>
                        <div className={styles.moneyInputWrap}>
                          <i>$</i>
                          <input
                            type="text"
                            value={formatAmountPesos(defaultMonthlyAmountInCents)}
                            readOnly
                            aria-readonly="true"
                            disabled={isCreatingStudent}
                          />
                        </div>
                        {paymentConfigError ? (
                          <small className={styles.fieldError}>{paymentConfigError}</small>
                        ) : (
                          <small>
                            Monto mensual global actual. Se actualiza desde "Pagos".
                          </small>
                        )}
                      </label>
                    </div>
                  </div>

                  {createStudentSubmitError ? (
                    <p className={styles.modalError}>
                      {createStudentSubmitError}
                    </p>
                  ) : null}

                  <div className={styles.modalActionsCreate}>
                    <button
                      type="button"
                      className={styles.modalCancelButton}
                      onClick={closeModal}
                      disabled={isCreatingStudent}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={styles.modalConfirmButton}
                      disabled={isCreatingStudent}
                    >
                      {isCreatingStudent ? "Creando..." : "Crear alumno"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}

          {activeModal === "detail" && activeUser ? (
            <div
              className={styles.detailModal}
              role="dialog"
              aria-modal="true"
              aria-label="Perfil de Usuario"
              onClick={(event) => event.stopPropagation()}
            >
              <header className={styles.detailHeader}>
                <div>
                  <h2>Perfil de Usuario</h2>
                  <p>Detalles completos e información personal.</p>
                </div>
                <button
                  type="button"
                  className={styles.modalCloseButton}
                  aria-label="Cerrar modal"
                  onClick={closeModal}
                >
                  <MaterialSymbol
                    name="close"
                    className={styles.modalCloseIcon}
                    weight={500}
                    opticalSize={22}
                  />
                </button>
              </header>

              <div className={styles.detailBody}>
                <section className={styles.profileHero}>
                  <div className={styles.heroAvatarWrap}>
                    <div className={styles.heroAvatar}>
                      {activeUser.initials}
                    </div>
                    <div className={styles.heroStatusPill}>
                      <span aria-hidden="true" />
                      {activeUser.status}
                    </div>
                  </div>
                  <div>
                    <h3>{activeUser.name}</h3>
                    <div className={styles.profileBadges}>
                      <span>{activeUser.role}</span>
                    </div>
                  </div>
                </section>

                <section className={styles.detailGrid}>
                  <article className={styles.detailSection}>
                    <header>
                      <MaterialSymbol
                        name="badge"
                        className={styles.detailSectionIcon}
                        weight={500}
                        opticalSize={18}
                      />
                      <h4>Información Personal</h4>
                    </header>
                    <div className={styles.personalCard}>
                      <div>
                        <label>Nombre Completo</label>
                        <p>{activeUser.fullName}</p>
                      </div>
                      <div>
                        <label>Rol</label>
                        <p>{activeUser.roleLabel}</p>
                      </div>
                      <div>
                        <label>Email</label>
                        <p>{activeUser.email}</p>
                      </div>
                      <div>
                        <label>Teléfono</label>
                        <p>{activeUser.phone}</p>
                      </div>
                      <div>
                        <label>Estado de alumno</label>
                        <p>{activeUser.studentStatusLabel}</p>
                      </div>
                      <div></div>
                    </div>
                  </article>

                  <article className={styles.detailSection}>
                    <header>
                      <MaterialSymbol
                        name="fitness_center"
                        className={styles.detailSectionIcon}
                        weight={500}
                        opticalSize={18}
                      />
                      <h4>Físico &amp; Biometría</h4>
                    </header>
                    <div className={styles.metricsGrid}>
                      <div>
                        <label>Género</label>
                        <p>{activeUser.gender}</p>
                      </div>
                      <div>
                        <label>Fecha Nac.</label>
                        <p>{activeUser.birthDate}</p>
                      </div>
                      <div>
                        <label>Altura</label>
                        <p>
                          {activeUser.heightCm === "—"
                            ? "—"
                            : `${activeUser.heightCm} cm`}
                        </p>
                      </div>
                      <div>
                        <label>Peso</label>
                        <p>
                          {activeUser.weightKg === "—"
                            ? "—"
                            : `${activeUser.weightKg} kg`}
                        </p>
                      </div>
                    </div>
                  </article>
                </section>
              </div>

              <footer className={styles.detailFooter}>
                <div>
                  <MaterialSymbol
                    name="schedule"
                    className={styles.detailFooterIcon}
                    weight={500}
                    opticalSize={16}
                  />
                  <span>Creado: {activeUser.createdAt}</span>
                  <span>Actualizado: {activeUser.updatedAt}</span>
                </div>
                <div className={styles.detailFooterActions}>
                  <button
                    type="button"
                    className={styles.modalCancelGhostButton}
                    onClick={closeModal}
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    className={styles.modalConfirmButton}
                    onClick={() => setActiveModal("edit")}
                  >
                    Editar Perfil
                  </button>
                </div>
              </footer>
            </div>
          ) : null}

          {activeModal === "edit" && activeUser ? (
            <div
              className={styles.editModal}
              role="dialog"
              aria-modal="true"
              aria-label="Editar usuario"
              onClick={(event) => event.stopPropagation()}
            >
              <header className={styles.editHeader}>
                <div>
                  <div className={styles.editTitleRow}>
                    <MaterialSymbol
                      name="edit_note"
                      className={styles.detailSectionIcon}
                      weight={500}
                      opticalSize={20}
                    />
                    <h2>Editar Usuario</h2>
                  </div>
                  <p>Modifica la información personal del usuario.</p>
                </div>
                <button
                  type="button"
                  className={styles.modalCloseButton}
                  aria-label="Cerrar modal"
                  onClick={closeModal}
                >
                  <MaterialSymbol
                    name="close"
                    className={styles.modalCloseIcon}
                    weight={500}
                    opticalSize={22}
                  />
                </button>
              </header>

              <div className={styles.editBody}>
                <section className={styles.editProfileRow}>
                  <div className={styles.editAvatarWrap}>
                    <img src={activeUser.photo} alt={activeUser.name} />
                    <button type="button" aria-label="Cambiar foto">
                      <MaterialSymbol
                        name="photo_camera"
                        className={styles.editCameraIcon}
                        weight={500}
                        opticalSize={18}
                      />
                    </button>
                  </div>
                  <div className={styles.editUploadWrap}>
                    <label>Foto de Perfil</label>
                    <button type="button">
                      <MaterialSymbol
                        name="upload"
                        className={styles.editUploadIcon}
                        weight={500}
                        opticalSize={16}
                      />
                      Click para subir imagen
                    </button>
                    <small>Imagen actual conservada</small>
                  </div>
                </section>

                <form
                  className={styles.editForm}
                  onSubmit={(event) => event.preventDefault()}
                >
                  <label className={styles.fieldWrap}>
                    <span>Nombre</span>
                    <input type="text" defaultValue={activeUser.firstName} />
                  </label>
                  <label className={styles.fieldWrap}>
                    <span>Apellido</span>
                    <input type="text" defaultValue={activeUser.lastName} />
                  </label>
                  <label
                    className={`${styles.fieldWrap} ${styles.editFullRow}`}
                  >
                    <span>Celular</span>
                    <div className={styles.leadingIconInput}>
                      <input type="text" defaultValue={activeUser.phone} />
                    </div>
                  </label>
                  <label className={styles.fieldWrap}>
                    <span>Género</span>
                    <div className={styles.selectWrap}>
                      <select defaultValue={activeUser.gender}>
                        <option>Masculino</option>
                        <option>Femenino</option>
                        <option>No binario</option>
                        <option>Otro</option>
                      </select>
                      <MaterialSymbol
                        name="expand_more"
                        className={styles.selectIcon}
                        weight={500}
                        opticalSize={18}
                      />
                    </div>
                  </label>
                  <label className={styles.fieldWrap}>
                    <span>Fecha de nacimiento</span>
                    <div className={styles.leadingIconInput}>
                      <MaterialSymbol
                        name="calendar_today"
                        className={styles.leadingInputIcon}
                        weight={500}
                        opticalSize={16}
                      />
                      <input type="text" defaultValue={activeUser.birthDate} />
                    </div>
                  </label>
                  <label className={styles.fieldWrap}>
                    <span>Altura (cm)</span>
                    <div className={styles.trailingUnitInput}>
                      <input type="number" defaultValue={activeUser.heightCm} />
                      <i>cm</i>
                    </div>
                  </label>
                  <label className={styles.fieldWrap}>
                    <span>Peso (kg)</span>
                    <div className={styles.trailingUnitInput}>
                      <input type="number" defaultValue={activeUser.weightKg} />
                      <i>kg</i>
                    </div>
                  </label>
                </form>
              </div>

              <footer className={styles.editFooter}>
                <button
                  type="button"
                  className={styles.modalCancelGhostButton}
                  onClick={closeModal}
                >
                  Cancelar
                </button>
                <button type="button" className={styles.modalConfirmButton}>
                  <MaterialSymbol
                    name="save"
                    className={styles.confirmIcon}
                    fill={1}
                    weight={500}
                    opticalSize={18}
                  />
                  Guardar Cambios
                </button>
              </footer>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeModal === "delete" && activeUser ? (
        <DestructiveConfirmationModal
          ariaLabel={`Eliminar alumno ${activeUser.name}`}
          title="¿Eliminar alumno?"
          description="Esta acción es permanente y no se puede deshacer. Se eliminarán todos los datos, rutinas y registros de pagos asociados a este usuario."
          headerAlignment="center"
          density="compact"
          confirmLabel="Eliminar alumno"
          pendingConfirmLabel="Eliminando..."
          isPending={isDeletingUser}
          errorMessage={deleteUserError}
          onConfirm={handleDeleteUserConfirm}
          onCancel={closeModal}
          targetCard={
            <>
              <div className={styles.deleteAvatarWrap}>
                <img src={activeUser.photo} alt={activeUser.name} />
              </div>

              <div>
                <small>Gestión de alumnos</small>
                <strong>{activeUser.name}</strong>
              </div>

              <em>
                {activeUser.email} · {activeUser.status}
              </em>
            </>
          }
        />
      ) : null}
    </section>
  );
}
