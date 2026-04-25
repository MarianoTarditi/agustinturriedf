import { ApiError, apiSuccess } from "@/lib/http/api-response";

export const PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE = "Si el email existe, te enviamos instrucciones.";
export const PASSWORD_RESET_CONFIRM_SUCCESS_MESSAGE = "Contraseña actualizada.";

export const createValidationError = (details: unknown) =>
  new ApiError("Validation failed", 400, "VALIDATION_ERROR", details);

export const passwordResetGenericSuccessResponse = () =>
  apiSuccess({
    message: PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
  });

export const passwordResetConfirmSuccessResponse = () =>
  apiSuccess({
    message: PASSWORD_RESET_CONFIRM_SUCCESS_MESSAGE,
  });
