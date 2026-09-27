import { requireRole } from "@/features/auth/authorization";
import { paymentsService } from "@/features/payments/service";
import { parseBuenosAiresDateInput } from "@/features/payments/timezone";
import { requireSession } from "@/features/auth/session";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { registerPaymentSchema } from "@/lib/validation/payments";

const resolveTrainerId = (actor: Awaited<ReturnType<typeof requireSession>>) => actor.id;

export const POST = async (request: Request) => {
  try {
    const actor = await requireSession();
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden registrar pagos");

    const payload = await request.json();
    const parsedPayload = registerPaymentSchema.safeParse(payload);

    if (!parsedPayload.success) {
      throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedPayload.error.flatten());
    }

    const result = await paymentsService.registerPayment(resolveTrainerId(actor), actor.id, {
      studentProfileId: parsedPayload.data.studentProfileId,
      amountInCents: parsedPayload.data.amountInCents,
      paymentDate: parseBuenosAiresDateInput(parsedPayload.data.paymentDate),
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
};
