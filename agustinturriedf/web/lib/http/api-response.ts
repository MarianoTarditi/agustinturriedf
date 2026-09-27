import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, status = 500, code = "INTERNAL_SERVER_ERROR", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ApiSuccessBody<T> = {
  success: true;
  data: T;
};

type ApiErrorBody = {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
};

export const apiSuccess = <T>(data: T, init?: ResponseInit) =>
  NextResponse.json<ApiSuccessBody<T>>(
    {
      success: true,
      data,
    },
    {
      status: init?.status ?? 200,
      headers: init?.headers,
    }
  );

export const apiError = (error: ApiError | string, init?: ResponseInit) => {
  const normalizedError =
    typeof error === "string" ? new ApiError(error, init?.status ?? 500, "INTERNAL_SERVER_ERROR") : error;

  return NextResponse.json<ApiErrorBody>(
    {
      success: false,
      error: {
        message: normalizedError.message,
        code: normalizedError.code,
        details: normalizedError.details,
      },
    },
    {
      status: init?.status ?? normalizedError.status,
      headers: init?.headers,
    }
  );
};

export const handleApiError = (error: unknown) => {
  if (error instanceof ApiError) {
    return apiError(error);
  }

  if (error instanceof ZodError) {
    return apiError(new ApiError("Validation failed", 400, "VALIDATION_ERROR", error.flatten()));
  }

  return apiError(new ApiError("Internal server error", 500, "INTERNAL_SERVER_ERROR"));
};
