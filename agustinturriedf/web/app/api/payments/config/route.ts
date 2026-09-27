import { requireRole } from "@/features/auth/authorization";
import { paymentsService } from "@/features/payments/service";
import { requireSession } from "@/features/auth/session";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { paymentConfigUpdateSchema } from "@/lib/validation/payments";

const resolveTrainerId = (actor: Awaited<ReturnType<typeof requireSession>>) => actor.id;

export const GET = async () => {
  try {
    const actor = await requireSession();
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden consultar configuración de pagos");

    const config = await paymentsService.getTrainerDefaultAmount(resolveTrainerId(actor));

    return apiSuccess(config);
  } catch (error) {
    return handleApiError(error);
  }
};

export const PATCH = async (request: Request) => {
  try {
    const actor = await requireSession();
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden editar configuración de pagos");

    const payload = await request.json();
    const parsedPayload = paymentConfigUpdateSchema.safeParse(payload);

    if (!parsedPayload.success) {
      throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedPayload.error.flatten());
    }

    const config = await paymentsService.updateTrainerDefaultAmount(
      resolveTrainerId(actor),
      parsedPayload.data.defaultMonthlyAmountInCents
    );

    return apiSuccess(config);
  } catch (error) {
    return handleApiError(error);
  }
};
