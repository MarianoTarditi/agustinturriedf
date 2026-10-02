import { requireRole } from "@/features/auth/authorization";
import { paymentsService } from "@/features/payments/service";
import { requireSession } from "@/features/auth/session";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { paymentDashboardFiltersSchema } from "@/lib/validation/payments";

export const GET = async (request: Request) => {
  try {
    const actor = await requireSession();
    requireRole(actor, ["ADMIN", "TRAINER"], "Solo ADMIN y TRAINER pueden ver pagos");

    const { searchParams } = new URL(request.url);
    const parsedFilters = paymentDashboardFiltersSchema.safeParse({
      query: searchParams.get("query") ?? undefined,
      view: searchParams.get("view") ?? undefined,
    });

    if (!parsedFilters.success) {
      throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedFilters.error.flatten());
    }

    const dashboard = await paymentsService.getDashboard({ id: actor.id, role: actor.role as "ADMIN" | "TRAINER" }, parsedFilters.data);

    return apiSuccess(dashboard);
  } catch (error) {
    return handleApiError(error);
  }
};
