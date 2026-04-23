export type PaymentView = "ALL" | "DUE_TODAY" | "DUE_THIS_WEEK" | "OVERDUE";

type ApiErrorResponse = {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
};

type PaymentDashboardRow = {
  studentProfileId: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  studentStatus: "ACTIVE" | "INACTIVE" | "BLOCKED";
  paymentStatus: "CURRENT" | "DUE_SOON" | "OVERDUE";
  amountInCents: number;
  startDate: string;
  dueDate: string;
  daysToExpire: number;
};

type PaymentsDashboardData = {
  cards: {
    collectedCount: number;
    collectedAmountInCents: number;
    dueSoonCount: number;
    overdueCount: number;
    overdueAmountInCents: number;
    estimatedTotalInCents: number;
    studentsInEstimatedTotal: number;
  };
  rows: PaymentDashboardRow[];
  config: {
    trainerId: string;
    defaultMonthlyAmountInCents: number;
  };
  filters: {
    query: string;
    view: PaymentView;
  };
};

type PaymentsDashboardResponse =
  | {
      success: true;
      data: PaymentsDashboardData;
    }
  | ApiErrorResponse;

type RegisterPaymentResponse =
  | {
      success: true;
      data: {
        currentPayment: {
          id: string;
          studentProfileId: string;
          amountInCents: number;
          startDate: string;
          dueDate: string;
        };
      };
    }
  | ApiErrorResponse;

type EditPaymentResponse =
  | {
      success: true;
      data: {
        id: string;
        studentProfileId: string;
        amountInCents: number;
        startDate: string;
        dueDate: string;
      };
    }
  | ApiErrorResponse;

type PaymentConfigResponse =
  | {
      success: true;
      data: {
        trainerId: string;
        defaultMonthlyAmountInCents: number;
      };
    }
  | ApiErrorResponse;

export const formatCurrencyARS = (amountInCents: number) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountInCents / 100);
};

export const formatDateEsAr = (value: string | Date) => {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("es-AR");
};

export const mapDaysToExpireLabel = (daysToExpire: number) => {
  if (daysToExpire === 0) {
    return "Vence hoy";
  }

  if (daysToExpire > 0) {
    return `${daysToExpire} día${daysToExpire === 1 ? "" : "s"}`;
  }

  const overdueDays = Math.abs(daysToExpire);
  return `${overdueDays} día${overdueDays === 1 ? "" : "s"} vencido${overdueDays === 1 ? "" : "s"}`;
};

export const mapRowStatusLabel = (
  studentStatus: PaymentDashboardRow["studentStatus"],
  paymentStatus: PaymentDashboardRow["paymentStatus"]
) => {
  if (paymentStatus === "OVERDUE") {
    return "Bloqueado por pago";
  }

  if (studentStatus === "INACTIVE" || studentStatus === "BLOCKED") {
    return "Suspendido";
  }

  return "Activo";
};

export const buildInitials = (fullName: string) => {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "--";
};

export const fetchPaymentsDashboard = async (
  fetchImpl: typeof fetch,
  input: {
    view: PaymentView;
    query?: string;
  }
): Promise<PaymentsDashboardData> => {
  const searchParams = new URLSearchParams();
  searchParams.set("view", input.view);

  const normalizedQuery = input.query?.trim();

  if (normalizedQuery) {
    searchParams.set("query", normalizedQuery);
  }

  const response = await fetchImpl(`/api/payments?${searchParams.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as PaymentsDashboardResponse;

  if (!response.ok || !payload.success) {
    const message = payload.success ? "No se pudo cargar la vista de pagos" : payload.error.message;
    throw new Error(message);
  }

  return payload.data;
};

export const registerPaymentRuntime = async (
  fetchImpl: typeof fetch,
  input: {
    studentProfileId: string;
    amountInCents: number;
    paymentDate: string;
  }
) => {
  const response = await fetchImpl("/api/payments/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as RegisterPaymentResponse;

  if (!response.ok || !payload.success) {
    const message = payload.success ? "No se pudo registrar el pago" : payload.error.message;
    throw new Error(message);
  }

  return payload.data;
};

export const editPaymentRuntime = async (
  fetchImpl: typeof fetch,
  input: {
    studentProfileId: string;
    amountInCents: number;
    startDate: string;
  }
) => {
  const response = await fetchImpl(`/api/payments/${encodeURIComponent(input.studentProfileId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amountInCents: input.amountInCents,
      startDate: input.startDate,
    }),
  });

  const payload = (await response.json()) as EditPaymentResponse;

  if (!response.ok || !payload.success) {
    const message = payload.success ? "No se pudo editar el pago" : payload.error.message;
    throw new Error(message);
  }

  return payload.data;
};

export const fetchPaymentConfigRuntime = async (fetchImpl: typeof fetch) => {
  const response = await fetchImpl("/api/payments/config", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as PaymentConfigResponse;

  if (!response.ok || !payload.success) {
    const message = payload.success
      ? "No se pudo cargar la configuración general de pagos"
      : payload.error.message;
    throw new Error(message);
  }

  return payload.data;
};

export const updatePaymentConfigRuntime = async (
  fetchImpl: typeof fetch,
  input: {
    defaultMonthlyAmountInCents: number;
  }
) => {
  const response = await fetchImpl("/api/payments/config", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as PaymentConfigResponse;

  if (!response.ok || !payload.success) {
    const message = payload.success
      ? "No se pudo guardar la configuración general de pagos"
      : payload.error.message;
    throw new Error(message);
  }

  return payload.data;
};
