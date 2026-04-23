type UserRow = {
  id: string;
  photo: string;
  firstName: string;
  lastName: string;
  name: string;
  fullName: string;
  email: string;
  phone: string;
  roleLabel: string;
  role: "student" | "trainer" | "admin";
  status: "Activo" | "Inactivo";
  studentStatus: "ACTIVE" | "INACTIVE" | "BLOCKED" | null;
  studentStatusLabel: string;
  trainerId: string | null;
  birthDate: string;
  gender: string;
  heightCm: string;
  weightKg: string;
  initials: string;
  createdAt: string;
  updatedAt: string;
};

type UserApiErrorResponse = {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
};

type PaymentConfigApiResponse =
  | {
      success: true;
      data: {
        trainerId: string;
        defaultMonthlyAmountInCents: number;
      };
    }
  | UserApiErrorResponse;

export type ApiUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  birthDate: string | null;
  gender: "MALE" | "FEMALE" | "NON_BINARY" | "OTHER" | null;
  heightCm: number | null;
  weightKg: number | null;
  role: "ADMIN" | "TRAINER" | "STUDENT";
  createdAt: string;
  updatedAt: string;
  studentProfile: {
    trainerId: string;
    status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  } | null;
};

export type UsersApiResponse =
  | {
      success: true;
      data: ApiUser[];
    }
  | UserApiErrorResponse;

export type CreateStudentPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  birthDate?: string | null;
  gender?: "MALE" | "FEMALE" | "NON_BINARY" | "OTHER" | null;
  heightCm?: number | null;
  weightKg?: number | null;
  role: "STUDENT";
  trainerId: string;
  studentStatus: "ACTIVE";
  initialPaymentStartDate?: string | null;
};

export type CreateUserApiResponse =
  | {
      success: true;
      data: ApiUser;
    }
  | UserApiErrorResponse;

export type DeleteUserApiResponse =
  | {
      success: true;
      data: unknown;
    }
  | UserApiErrorResponse;

const toAvatarDataUri = (initials: string) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='#25153a'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='28' font-weight='700' fill='#e4c2ff'>${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const getInitials = (firstName: string, lastName: string) => `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

const mapRole = (role: ApiUser["role"]): UserRow["role"] => {
  if (role === "ADMIN") return "admin";
  if (role === "TRAINER") return "trainer";
  return "student";
};

const mapRoleLabel = (role: ApiUser["role"]) => {
  if (role === "ADMIN") return "Admin";
  if (role === "TRAINER") return "Trainer";
  return "Student";
};

const mapStatus = (role: ApiUser["role"], studentProfile: ApiUser["studentProfile"]): UserRow["status"] => {
  if (role !== "STUDENT") return "Activo";
  if (!studentProfile || studentProfile.status === "ACTIVE") return "Activo";
  return "Inactivo";
};

const mapStudentStatusLabel = (role: ApiUser["role"], studentProfile: ApiUser["studentProfile"]) => {
  if (role !== "STUDENT" || !studentProfile) return "";

  if (studentProfile.status === "ACTIVE") return "Activo";
  if (studentProfile.status === "INACTIVE") return "Inactivo";
  return "Bloqueado";
};

const mapGenderLabel = (gender: ApiUser["gender"]) => {
  if (gender === "MALE") return "Masculino";
  if (gender === "FEMALE") return "Femenino";
  if (gender === "NON_BINARY") return "No binario";
  if (gender === "OTHER") return "Otro";
  return "";
};

const formatCreatedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-AR");
};

const formatBirthDate = (value: string | null) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("es-AR");
};

export const mapApiUserToRow = (user: ApiUser): UserRow => {
  const initials = getInitials(user.firstName, user.lastName);
  const avatar = toAvatarDataUri(initials);
  const normalizedPhotoUrl = typeof user.photoUrl === "string" && user.photoUrl.trim().length > 0 ? user.photoUrl : null;

  return {
    id: user.id,
    photo: normalizedPhotoUrl ?? avatar,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`.trim(),
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    phone: user.phone && user.phone.trim().length > 0 ? user.phone : "",
    roleLabel: mapRoleLabel(user.role),
    role: mapRole(user.role),
    status: mapStatus(user.role, user.studentProfile),
    studentStatus: user.studentProfile?.status ?? null,
    studentStatusLabel: mapStudentStatusLabel(user.role, user.studentProfile),
    trainerId: user.studentProfile?.trainerId ?? null,
    birthDate: formatBirthDate(user.birthDate),
    gender: mapGenderLabel(user.gender),
    heightCm: user.heightCm === null ? "" : String(user.heightCm),
    weightKg: user.weightKg === null ? "" : String(user.weightKg),
    initials,
    createdAt: formatCreatedAt(user.createdAt),
    updatedAt: formatCreatedAt(user.updatedAt),
  };
};

export const fetchUsersRuntime = async (fetchImpl: typeof fetch): Promise<UserRow[]> => {
  const response = await fetchImpl("/api/users", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as UsersApiResponse;

  if (!response.ok || !payload.success) {
    const message = payload.success ? "No se pudo cargar la lista de usuarios." : payload.error.message;
    throw new Error(message);
  }

  return payload.data.map(mapApiUserToRow);
};

export const createStudentRuntime = async (
  fetchImpl: typeof fetch,
  payload: CreateStudentPayload
): Promise<UserRow> => {
  const response = await fetchImpl("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responsePayload = (await response.json()) as CreateUserApiResponse;

  if (!response.ok || !responsePayload.success) {
    const message = responsePayload.success
      ? "No se pudo crear el alumno."
      : responsePayload.error.message;
    throw new Error(message);
  }

  return mapApiUserToRow(responsePayload.data);
};

export const fetchPaymentConfigRuntime = async (fetchImpl: typeof fetch) => {
  const response = await fetchImpl("/api/payments/config", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as PaymentConfigApiResponse;

  if (!response.ok || !payload.success) {
    const message = payload.success
      ? "No se pudo cargar la configuración de pagos."
      : payload.error.message;
    throw new Error(message);
  }

  return payload.data;
};

export const deleteUserRuntime = async (
  fetchImpl: typeof fetch,
  userId: string
): Promise<void> => {
  const response = await fetchImpl(`/api/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const responsePayload = (await response.json()) as DeleteUserApiResponse;

  if (!response.ok || !responsePayload.success) {
    const message = responsePayload.success
      ? "No se pudo eliminar el usuario."
      : responsePayload.error.message;
    throw new Error(message);
  }
};

export type { UserRow };
