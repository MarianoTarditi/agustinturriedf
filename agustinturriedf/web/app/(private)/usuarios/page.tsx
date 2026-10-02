"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/(private)/usuarios/usuarios.module.css";
import { z } from "zod";
import { DestructiveConfirmationModal } from "@/components/destructive-confirmation-modal";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";
import { useToast } from "@/components/toast-provider";
import {
  createInvitationRuntime,
  archiveUserRuntime,
  fetchInvitationsRuntime,
  fetchPaymentConfigRuntime,
  fetchUsersRuntime,
  mergeUsersAndInvitations,
  resendInvitationRuntime,
  revokeInvitationRuntime,
  type UserRow,
} from "@/app/(private)/usuarios/runtime";

type ModalType = "create" | "detail" | "edit" | "delete" | "revokeInvitation";

type SortKey = "name" | "email" | "role" | "status";
type SortDirection = "ascending" | "descending";
type SortState = { key: SortKey; direction: SortDirection } | null;

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

const userCollator = new Intl.Collator("es-AR", {
  sensitivity: "base",
  numeric: true,
});

const normalizeSearchValue = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-AR");

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

type SortableHeaderProps = {
  label: string;
  sortKey: SortKey;
  sortState: SortState;
  onSort: (key: SortKey) => void;
};

function SortableHeader({
  label,
  sortKey,
  sortState,
  onSort,
}: SortableHeaderProps) {
  const direction = sortState?.key === sortKey ? sortState.direction : null;
  const nextDirection = direction === "ascending" ? "descendente" : "ascendente";
  const icon = direction === "ascending"
    ? "arrow_upward"
    : direction === "descending"
      ? "arrow_downward"
      : "unfold_more";

  return (
    <th
      aria-sort={direction ?? "none"}
      className={direction ? styles.activeSortHeader : undefined}
    >
      <button
        type="button"
        className={styles.headerSortButton}
        aria-label={`Ordenar ${label} ${nextDirection}`}
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        <MaterialSymbol
          name={icon}
          className={styles.sortDirectionIcon}
          weight={500}
          opticalSize={18}
        />
      </button>
    </th>
  );
}

export default function UsuariosPage() {
  const PAGE_SIZE = 4;
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [sortState, setSortState] = useState<SortState>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModal, setActiveModal] = useState<ModalType | null>(null);
  const [activeUser, setActiveUser] = useState<UserRow | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
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
  const [invitationActionId, setInvitationActionId] = useState<string | null>(null);
  const [invitationActionError, setInvitationActionError] = useState<string | null>(null);
  const archivePending = useRef(false);
  const [defaultMonthlyAmountInCents, setDefaultMonthlyAmountInCents] = useState<number | null>(null);
  const [paymentConfigError, setPaymentConfigError] = useState<string | null>(null);

  const resetCreateStudentModalState = () => {
    setCreateStudentForm(createDefaultCreateStudentForm());
    setCreateStudentErrors({});
    setCreateStudentSubmitError(null);
    setIsCreatingStudent(false);
  };

  const closeModal = () => {
    if (isCreatingStudent || isDeletingUser || invitationActionId) return;

    if (activeModal === "create") {
      resetCreateStudentModalState();
    }

    if (activeModal === "delete" || activeModal === "revokeInvitation") {
      setDeleteUserError(null);
      setInvitationActionError(null);
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
    setActiveModal(modal);
  };

  const handleDeleteUserConfirm = async () => {
    if (!activeUser || archivePending.current) {
      return;
    }

    const userId = activeUser.id;

    try {
      archivePending.current = true;
      setIsDeletingUser(true);
      setDeleteUserError(null);

      await archiveUserRuntime(fetch, userId, activeUser.version, "Archivado desde la gestión de usuarios.");

      setUsers((current) => current.filter((user) => user.id !== userId));
      setActiveUser(null);
      setActiveModal(null);
    } catch (error) {
      setDeleteUserError(
        error instanceof Error
          ? error.message
          : "No se pudo archivar el usuario.",
      );
    } finally {
      archivePending.current = false;
      setIsDeletingUser(false);
    }
  };

  const handleResendInvitation = async (invitation: UserRow) => {
    try {
      setInvitationActionId(invitation.id);
      await resendInvitationRuntime(fetch, invitation.id, invitation.version);
      setUsers((current) => current.filter((row) => row.id !== invitation.id));
      showToast("success", "Invitación enviada nuevamente.");
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "No se pudo enviar la invitación.",
      );
    } finally {
      setInvitationActionId(null);
    }
  };

  const handleRevokeInvitationConfirm = async () => {
    if (!activeUser || activeUser.kind !== "invitation") return;

    try {
      setInvitationActionId(activeUser.id);
      setInvitationActionError(null);
      await revokeInvitationRuntime(fetch, activeUser.id, activeUser.version);
      setUsers((current) => current.filter((row) => row.id !== activeUser.id));
      setActiveUser(null);
      setActiveModal(null);
      showToast("success", "Invitación revocada.");
    } catch (error) {
      setInvitationActionError(
        error instanceof Error ? error.message : "No se pudo revocar la invitación.",
      );
    } finally {
      setInvitationActionId(null);
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

    const trainerCandidate = users.find(
      (user) => user.kind === "user" && user.role === "trainer" && user.status === "Activo",
    );

    if (!trainerCandidate) {
      setCreateStudentSubmitError(
        "No hay entrenadores disponibles para asignar al alumno.",
      );
      return;
    }

    try {
      setIsCreatingStudent(true);
      setCreateStudentSubmitError(null);

      await createInvitationRuntime(fetch, {
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

      showToast(
        "success",
        "Invitación creada. El email de activación quedó en cola.",
      );
      resetCreateStudentModalState();
      setActiveModal(null);
    } catch (error) {
      setCreateStudentSubmitError(
        error instanceof Error ? error.message : "No se pudo enviar la invitación.",
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

        const [usersResult, invitationsResult, paymentConfigResult] = await Promise.allSettled([
          fetchUsersRuntime(fetch),
          fetchInvitationsRuntime(fetch),
          fetchPaymentConfigRuntime(fetch),
        ]);

        if (cancelled) return;

        if (usersResult.status === "fulfilled") {
          setUsers(
            invitationsResult.status === "fulfilled"
              ? mergeUsersAndInvitations(usersResult.value, invitationsResult.value)
              : usersResult.value,
          );
        } else {
          setUsersError(
            usersResult.reason instanceof Error
              ? usersResult.reason.message
              : "No se pudo cargar la lista de usuarios.",
          );
          setUsers([]);
        }

        if (paymentConfigResult.status === "fulfilled") {
          setDefaultMonthlyAmountInCents(
            paymentConfigResult.value.defaultMonthlyAmountInCents,
          );
        } else {
          setPaymentConfigError(
            paymentConfigResult.reason instanceof Error
              ? paymentConfigResult.reason.message
              : "No se pudo cargar la configuración de pagos.",
          );
        }
      } catch {
        if (cancelled) return;

        setUsersError("No se pudo cargar la lista de usuarios.");
        setUsers([]);
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
    (user) => user.kind === "user" && user.role === "student" && user.status === "Activo",
  ).length;
  const inactiveStudents = users.filter(
    (user) => user.kind === "user" && user.role === "student" && user.status !== "Activo",
  ).length;
  const managementUsers = users.filter(
    (user) => user.kind === "user" && (user.role === "admin" || user.role === "trainer"),
  ).length;
  const totalUsers = users.filter((user) => user.kind === "user").length;
  const filteredUsers = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(searchQuery.trim());

    if (!normalizedQuery) {
      return users;
    }

    return users.filter((user) =>
      normalizeSearchValue(user.name).includes(normalizedQuery) ||
      normalizeSearchValue(user.email).includes(normalizedQuery),
    );
  }, [searchQuery, users]);
  const sortedUsers = useMemo(() => {
    if (!sortState) {
      return filteredUsers;
    }

    const directionMultiplier = sortState.direction === "ascending" ? 1 : -1;

    return filteredUsers
      .map((user, index) => ({ user, index }))
      .sort((left, right) => {
        const comparison = userCollator.compare(
          left.user[sortState.key],
          right.user[sortState.key],
        );

        return comparison === 0
          ? left.index - right.index
          : comparison * directionMultiplier;
      })
      .map(({ user }) => user);
  }, [filteredUsers, sortState]);
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedUsers = sortedUsers.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE,
  );

  const handleSort = (key: SortKey) => {
    setSortState((current) => ({
      key,
      direction:
        current?.key === key && current.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  useEffect(() => {
    if (!activeModal) return;

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [activeModal, isCreatingStudent, isDeletingUser, invitationActionId]);

  return (
    <section className={styles.page}>
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
            <div className={styles.tableToolbarInfo}>
              <div className={styles.tableTitleRow}>
                <h3>{users.length} usuarios totales</h3>
              </div>

              <label className={styles.searchField}>
                <MaterialSymbol
                  name="search"
                  className={styles.searchIcon}
                  weight={450}
                  opticalSize={20}
                />
                <span className={styles.srOnly}>Buscar usuarios por nombre o email</span>
                <input
                  type="search"
                  value={searchQuery}
                  placeholder="Buscar por nombre o email"
                  onChange={(event) => handleSearchChange(event.target.value)}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className={styles.clearSearchButton}
                    aria-label="Limpiar búsqueda"
                    onClick={() => handleSearchChange("")}
                  >
                    <MaterialSymbol
                      name="close"
                      className={styles.clearSearchIcon}
                      weight={500}
                      opticalSize={18}
                    />
                  </button>
                ) : null}
              </label>
            </div>

            <div className={styles.tableActions}>
              <button
                type="button"
                className={styles.createButton}
                onClick={() => {
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
                  <SortableHeader
                    label="Usuario"
                    sortKey="name"
                    sortState={sortState}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Email"
                    sortKey="email"
                    sortState={sortState}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Roles"
                    sortKey="role"
                    sortState={sortState}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Estado"
                    sortKey="status"
                    sortState={sortState}
                    onSort={handleSort}
                  />
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
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No se encontraron usuarios.</td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div
                          className={`${styles.avatarWrap} ${user.status !== "Activo" ? styles.avatarInactive : ""}`}
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
                          className={`${styles.userName} ${user.status !== "Activo" ? styles.userNameInactive : ""}`}
                        >
                          {user.name}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.userEmail} ${user.status !== "Activo" ? styles.userEmailInactive : ""}`}
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
                            className={`${styles.statusDot} ${
                              user.status === "Activo"
                                ? styles.active
                                : user.status === "Enviada"
                                  ? styles.invitationSentDot
                                  : user.status === "Vencida"
                                    ? styles.invitationExpiredDot
                                    : styles.inactive
                            }`}
                          />
                          <span
                            className={
                              user.status === "Activo"
                                ? styles.statusActive
                                : user.status === "Enviada"
                                  ? styles.invitationSent
                                  : user.status === "Vencida"
                                    ? styles.invitationExpired
                                    : styles.statusInactive
                            }
                          >
                            {user.status}
                          </span>
                        </span>
                      </td>
                      <td className={styles.alignRight}>
                        <div className={styles.rowActionsInline}>
                          {user.kind === "invitation" ? (
                            user.status === "Enviada" ? (
                              <button
                                className={`${styles.invitationActionButton} ${styles.revokeInvitationButton}`}
                                type="button"
                                disabled={invitationActionId === user.id}
                                onClick={() => {
                                  setInvitationActionError(null);
                                  setActiveUser(user);
                                  setActiveModal("revokeInvitation");
                                }}
                              >
                                Revocar
                              </button>
                            ) : (
                              <button
                                className={styles.invitationActionButton}
                                type="button"
                                disabled={invitationActionId === user.id}
                                onClick={() => void handleResendInvitation(user)}
                              >
                                {invitationActionId === user.id ? "Enviando..." : "Enviar"}
                              </button>
                            )
                          ) : (
                            <>
                              <button
                                className={styles.moreButton}
                                type="button"
                                aria-label={`Ver detalle de ${user.name}`}
                                onClick={() => openUserModal("detail", user)}
                              >
                                <MaterialSymbol name="visibility" className={styles.rowActionIcon} weight={500} opticalSize={20} />
                              </button>
                              <button
                                className={styles.moreButton}
                                type="button"
                                aria-label={`Editar usuario ${user.name}`}
                                onClick={() => openUserModal("edit", user)}
                              >
                                <MaterialSymbol name="edit_note" className={styles.rowActionIcon} weight={500} opticalSize={20} />
                              </button>
                              <button
                                className={`${styles.moreButton} ${styles.deleteActionButton}`}
                                type="button"
                                aria-label={`Archivar alumno ${user.name}`}
                                onClick={() => openUserModal("delete", user)}
                              >
                                <MaterialSymbol name="archive" className={styles.rowActionIcon} weight={500} opticalSize={20} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <footer className={styles.pagination}>
              <p>
                Página {safeCurrentPage} de {totalPages}
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage <= 1}
                  aria-label="Página anterior"
                >
                  <MaterialSymbol
                    name="chevron_left"
                    className={styles.paginationIcon}
                    weight={500}
                    opticalSize={20}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  aria-label="Página siguiente"
                >
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

      {activeModal && activeModal !== "delete" && activeModal !== "revokeInvitation" ? (
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
                      desde esta seccion. El alumno recibirá un email de activación
                      para definir una contraseña segura con su
                      <span className={styles.modalCodeLabel}>
                        {" "}
                        &quot;Email&quot;{" "}
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
                  <div className={styles.heroAvatar} aria-hidden="true">
                    {activeUser.initials}
                  </div>
                  <div className={styles.profileHeroCopy}>
                    <span className={styles.profileEyebrow}>Ficha de usuario</span>
                    <h3>{activeUser.name}</h3>
                    <div className={styles.profileBadges}>
                      <span>{activeUser.roleLabel}</span>
                      <span
                        className={`${styles.profileStatusBadge} ${
                          activeUser.status === "Activo"
                            ? styles.profileStatusActive
                            : styles.profileStatusInactive
                        }`}
                      >
                        <i aria-hidden="true" />
                        {activeUser.status}
                      </span>
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
                    <dl className={styles.personalCard}>
                      <div>
                        <dt>Nombre completo</dt>
                        <dd>{activeUser.fullName}</dd>
                      </div>
                      <div>
                        <dt>Rol</dt>
                        <dd>{activeUser.roleLabel}</dd>
                      </div>
                      <div className={styles.detailFieldWide}>
                        <dt>Email</dt>
                        <dd>{activeUser.email}</dd>
                      </div>
                      <div>
                        <dt>Teléfono</dt>
                        <dd className={activeUser.phone ? undefined : styles.detailEmpty}>
                          {activeUser.phone || "Sin registrar"}
                        </dd>
                      </div>
                      <div>
                        <dt>Estado de alumno</dt>
                        <dd className={activeUser.studentStatusLabel ? undefined : styles.detailEmpty}>
                          {activeUser.studentStatusLabel || "Sin registrar"}
                        </dd>
                      </div>
                    </dl>
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
                    <dl className={styles.metricsGrid}>
                      <div>
                        <dt>Género</dt>
                        <dd className={activeUser.gender ? undefined : styles.detailEmpty}>
                          {activeUser.gender || "Sin registrar"}
                        </dd>
                      </div>
                      <div>
                        <dt>Fecha de nacimiento</dt>
                        <dd className={activeUser.birthDate ? undefined : styles.detailEmpty}>
                          {activeUser.birthDate || "Sin registrar"}
                        </dd>
                      </div>
                      <div>
                        <dt>Altura</dt>
                        <dd className={activeUser.heightCm ? undefined : styles.detailEmpty}>
                          {activeUser.heightCm ? `${activeUser.heightCm} cm` : "Sin registrar"}
                        </dd>
                      </div>
                      <div>
                        <dt>Peso</dt>
                        <dd className={activeUser.weightKg ? undefined : styles.detailEmpty}>
                          {activeUser.weightKg ? `${activeUser.weightKg} kg` : "Sin registrar"}
                        </dd>
                      </div>
                    </dl>
                  </article>
                </section>
              </div>

              <footer className={styles.detailFooter}>
                <div className={styles.detailAudit}>
                  <MaterialSymbol
                    name="schedule"
                    className={styles.detailFooterIcon}
                    weight={500}
                    opticalSize={16}
                  />
                  <span>
                    <small>Creado</small>
                    <strong>{activeUser.createdAt || "Sin registrar"}</strong>
                  </span>
                  <span>
                    <small>Actualizado</small>
                    <strong>{activeUser.updatedAt || "Sin registrar"}</strong>
                  </span>
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
          className={styles.archiveModal}
          ariaLabel={`Archivar alumno ${activeUser.name}`}
          title="¿Archivar alumno?"
          description="El alumno dejará de aparecer en la lista y no podrá acceder a su cuenta. Sus datos, rutinas y pagos se conservarán."
          headerAlignment="start"
          density="compact"
          confirmLabel="Archivar alumno"
          pendingConfirmLabel="Archivando..."
          isPending={isDeletingUser}
          errorMessage={deleteUserError}
          onConfirm={handleDeleteUserConfirm}
          onCancel={closeModal}
          targetCard={
            <>
              <div className={styles.deleteAvatarWrap}>
                <img src={activeUser.photo} alt={activeUser.name} />
              </div>

              <div className={styles.archiveIdentity}>
                <small>Gestión de alumnos</small>
                <strong>{activeUser.name}</strong>
                <span className={styles.archiveEmail}>{activeUser.email}</span>
                <span className={styles.archiveStatus}>{activeUser.status}</span>
              </div>
            </>
          }
        />
      ) : null}

      {activeModal === "revokeInvitation" && activeUser?.kind === "invitation" ? (
        <DestructiveConfirmationModal
          ariaLabel={`Revocar invitación de ${activeUser.name}`}
          title="¿Revocar invitación?"
          description="El enlace de activación dejará de ser válido y no podrá utilizarse para crear la cuenta."
          density="compact"
          confirmLabel="Revocar invitación"
          pendingConfirmLabel="Revocando..."
          isPending={invitationActionId === activeUser.id}
          errorMessage={invitationActionError}
          onConfirm={handleRevokeInvitationConfirm}
          onCancel={closeModal}
          targetCard={
            <div className={styles.archiveIdentity}>
              <small>Invitación enviada</small>
              <strong>{activeUser.name}</strong>
              <span className={styles.archiveEmail}>{activeUser.email}</span>
            </div>
          }
        />
      ) : null}
    </section>
  );
}
