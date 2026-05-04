import { requireSession } from "@/features/auth/session";
import { invitationService } from "@/features/invitations/service";
import { apiSuccess, handleApiError } from "@/lib/http/api-response";

export const POST = async (_request: Request, context: { params: Promise<{ invitationId: string }> }) => {
  try {
    const actor = await requireSession();
    const params = await context.params;
    const invitation = await invitationService.resend(params.invitationId, actor);

    return apiSuccess(invitation);
  } catch (error) {
    return handleApiError(error);
  }
};
