import { ApiError, apiSuccess } from "@/lib/http/api-response";

export const ACTIVATION_SUCCESS_MESSAGE = "Cuenta activada. Ya podés iniciar sesión.";

export const activationSuccessResponse = () =>
  apiSuccess(
    {
      message: ACTIVATION_SUCCESS_MESSAGE,
    },
    {
      status: 200,
    }
  );

export const createActivationValidationError = (details: unknown) =>
  new ApiError("Validation failed", 400, "VALIDATION_ERROR", details);
