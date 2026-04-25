import { passwordResetService } from "@/features/auth/password-reset/service";
import { handleApiError } from "@/lib/http/api-response";
import { requestPasswordResetSchema } from "@/lib/validation/password-reset";

import {
  createValidationError,
  PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
  passwordResetGenericSuccessResponse,
} from "@/app/api/password-reset/contract";

export const PASSWORD_RESET_REQUEST_MIN_DURATION_MS = 250;

const waitForMinimumResponseDuration = async (startedAtMs: number) => {
  const elapsedMs = Date.now() - startedAtMs;
  const pendingMs = PASSWORD_RESET_REQUEST_MIN_DURATION_MS - elapsedMs;

  if (pendingMs <= 0) {
    return;
  }

  await new Promise((resolve) => {
    setTimeout(resolve, pendingMs);
  });
};

export const POST = async (request: Request) => {
  try {
    const payload = await request.json();
    const parsedPayload = requestPasswordResetSchema.safeParse(payload);

    if (!parsedPayload.success) {
      throw createValidationError(parsedPayload.error.flatten());
    }

    const startedAt = Date.now();

    await passwordResetService.requestReset(parsedPayload.data.email);
    await waitForMinimumResponseDuration(startedAt);

    return passwordResetGenericSuccessResponse();
  } catch (error) {
    return handleApiError(error);
  }
};

export { PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE };
