import { requireSession } from "@/features/auth/session";
import { invitationService } from "@/features/invitations/service";
import { apiSuccess, handleApiError } from "@/lib/http/api-response";
import { revokeInvitationSchema } from "@/lib/validation/invitations";

export const DELETE = async (request: Request, context: { params: Promise<{ invitationId: string }> }) => {
  try {
    const actor = await requireSession();
    const input = revokeInvitationSchema.parse({ ...(await context.params), ...(await request.json().catch(() => null)) });
    const result = await invitationService.revoke(input.invitationId, actor, input);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
};
