import { requireRole } from "@/features/auth/authorization";
import { paymentsService } from "@/features/payments/service";
import { parseBuenosAiresDateInput } from "@/features/payments/timezone";
import { requireSession } from "@/features/auth/session";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { editPaymentSchema, paymentStudentProfileParamSchema } from "@/lib/validation/payments";

type PaymentRouteContext = {
  params: Promise<{
    studentProfileId: string;
  }>;
};

const resolveStudentProfileId = async (context: PaymentRouteContext) => {
  const params = await context.params;
  const parsedParams = paymentStudentProfileParamSchema.safeParse(params);

  if (!parsedParams.success) {
    throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedParams.error.flatten());
  }

  return parsedParams.data.studentProfileId;
};

const resolveTrainerId = (actor: Awaited<ReturnType<typeof requireSession>>) => actor.id;

export const PATCH = async (request: Request, context: PaymentRouteContext) => {
  try {
    const actor = await requireSession();
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden editar pagos");

    const studentProfileId = await resolveStudentProfileId(context);
    const payload = await request.json();
    const parsedPayload = editPaymentSchema.safeParse(payload);

    if (!parsedPayload.success) {
      throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedPayload.error.flatten());
    }

    const updatedCurrentPayment = await paymentsService.editCurrentPayment(resolveTrainerId(actor), {
      studentProfileId,
      amountInCents: parsedPayload.data.amountInCents,
      startDate: parseBuenosAiresDateInput(parsedPayload.data.startDate),
    });

    return apiSuccess(updatedCurrentPayment);
  } catch (error) {
    return handleApiError(error);
  }
};
