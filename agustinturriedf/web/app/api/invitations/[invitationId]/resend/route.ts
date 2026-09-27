import { requireSession } from "@/features/auth/session";
import { invitationService } from "@/features/invitations/service";
import { apiSuccess, handleApiError } from "@/lib/http/api-response";
import { resendInvitationSchema } from "@/lib/validation/invitations";

export const POST = async (request: Request, context: { params: Promise<{ invitationId: string }> }) => {
  try {
    const actor = await requireSession();
    const input = resendInvitationSchema.parse({ ...(await context.params), ...(await request.json().catch(() => null)) });
    const invitation = await invitationService.resend(input.invitationId, actor, input.expectedVersion);

    return apiSuccess(invitation);
  } catch (error) {
    return handleApiError(error);
  }
};
