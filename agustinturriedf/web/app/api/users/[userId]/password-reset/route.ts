import { requireSession } from "@/features/auth/session";
import { passwordResetService } from "@/features/auth/password-reset/service";
import { apiSuccess, handleApiError } from "@/lib/http/api-response";

type PasswordResetRouteContext = { params: Promise<{ userId: string }> };

export const POST = async (_request: Request, context: PasswordResetRouteContext) => {
  try {
    const actor = await requireSession();
    const { userId } = await context.params;
    const result = await passwordResetService.requestResetForActor(actor, userId);

    return apiSuccess(result, { status: 202 });
  } catch (error) {
    return handleApiError(error);
  }
};
