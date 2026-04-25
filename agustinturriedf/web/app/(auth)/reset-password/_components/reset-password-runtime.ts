import { PASSWORD_RESET_CONFIRM_SUCCESS_MESSAGE, PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE } from "@/app/api/password-reset/contract";
import { passwordResetTokenQuerySchema } from "@/lib/validation/password-reset";

type ApiResponseBody =
  | {
      success: true;
      data?: {
        message?: string;
      };
    }
  | {
      success: false;
      error?: {
        message?: string;
      };
    };

type RequestResult = {
  success: boolean;
  errorMessage: string | null;
};

const UNKNOWN_ERROR_MESSAGE = "No se pudo completar la solicitud. Intentá nuevamente.";
export const INVALID_CONFIRM_TOKEN_MESSAGE = "El enlace de recuperación no es válido o ya expiró.";

const extractErrorMessage = (body: ApiResponseBody | null | undefined): string => {
  if (!body || body.success !== false) {
    return UNKNOWN_ERROR_MESSAGE;
  }

  const message = body.error?.message?.trim();

  return message?.length ? message : UNKNOWN_ERROR_MESSAGE;
};

const parseJsonSafely = async (response: Response): Promise<ApiResponseBody | null> => {
  try {
    return (await response.json()) as ApiResponseBody;
  } catch {
    return null;
  }
};

export const submitResetPasswordRequest = async ({
  email,
  fetchImpl,
  routerPush,
}: {
  email: string;
  fetchImpl: typeof fetch;
  routerPush: (href: string) => void;
}): Promise<RequestResult> => {
  const response = await fetchImpl("/api/password-reset/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const body = await parseJsonSafely(response);

  if (!response.ok) {
    return {
      success: false,
      errorMessage: extractErrorMessage(body),
    };
  }

  const message = body && body.success ? body.data?.message : undefined;

  if (message !== PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE) {
    return {
      success: false,
      errorMessage: UNKNOWN_ERROR_MESSAGE,
    };
  }

  routerPush("/reset-password/sent");

  return {
    success: true,
    errorMessage: null,
  };
};

export const submitResetPasswordConfirm = async ({
  token,
  password,
  confirmPassword,
  fetchImpl,
}: {
  token: string;
  password: string;
  confirmPassword: string;
  fetchImpl: typeof fetch;
}): Promise<RequestResult> => {
  const response = await fetchImpl("/api/password-reset/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, password, confirmPassword }),
  });

  const body = await parseJsonSafely(response);

  if (!response.ok) {
    return {
      success: false,
      errorMessage: extractErrorMessage(body),
    };
  }

  const message = body && body.success ? body.data?.message : undefined;

  if (message !== PASSWORD_RESET_CONFIRM_SUCCESS_MESSAGE) {
    return {
      success: false,
      errorMessage: UNKNOWN_ERROR_MESSAGE,
    };
  }

  return {
    success: true,
    errorMessage: null,
  };
};

export const resolveConfirmTokenFromSearchParams = (searchParams: { token?: string | string[] | undefined }) => {
  const rawToken = Array.isArray(searchParams.token) ? searchParams.token[0] : searchParams.token;
  const parsedToken = passwordResetTokenQuerySchema.safeParse({
    token: rawToken ?? "",
  });

  if (!parsedToken.success) {
    return {
      token: null,
      errorMessage: INVALID_CONFIRM_TOKEN_MESSAGE,
    };
  }

  return {
    token: parsedToken.data.token,
    errorMessage: null,
  };
};
