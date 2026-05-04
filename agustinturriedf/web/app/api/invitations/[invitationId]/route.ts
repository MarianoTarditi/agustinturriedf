import { requireSession } from "@/features/auth/session";
import { invitationService } from "@/features/invitations/service";
import { apiSuccess, handleApiError } from "@/lib/http/api-response";

export const GET = async (_request: Request, context: { params: Promise<{ invitationId: string }> }) => {
  try {
    const actor = await requireSession();
    const params = await context.params;
    const invitation = await invitationService.findByIdForActor(params.invitationId, actor);

    return apiSuccess(invitation);
  } catch (error) {
    return handleApiError(error);
  }
};

export const DELETE = async (_request: Request, context: { params: Promise<{ invitationId: string }> }) => {
  try {
    const actor = await requireSession();
    const params = await context.params;
    const result = await invitationService.revoke(params.invitationId, actor);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
};
