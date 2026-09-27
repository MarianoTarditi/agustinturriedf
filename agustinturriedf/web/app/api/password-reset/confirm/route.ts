import { passwordResetService } from "@/features/auth/password-reset/service";
import { handleApiError } from "@/lib/http/api-response";
import { confirmPasswordResetSchema } from "@/lib/validation/password-reset";

import {
  createValidationError,
  PASSWORD_RESET_CONFIRM_SUCCESS_MESSAGE,
  passwordResetConfirmSuccessResponse,
} from "@/app/api/password-reset/contract";

export const POST = async (request: Request) => {
  try {
    const payload = await request.json();
    const parsedPayload = confirmPasswordResetSchema.safeParse(payload);

    if (!parsedPayload.success) {
      throw createValidationError(parsedPayload.error.flatten());
    }

    await passwordResetService.confirmReset({
      token: parsedPayload.data.token,
      password: parsedPayload.data.password,
    });

    return passwordResetConfirmSuccessResponse();
  } catch (error) {
    return handleApiError(error);
  }
};

export { PASSWORD_RESET_CONFIRM_SUCCESS_MESSAGE };
