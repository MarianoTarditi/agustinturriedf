import { requireSession } from "@/features/auth/session";
import { invitationService } from "@/features/invitations/service";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { createInvitationSchema } from "@/lib/validation/invitations";

export const GET = async () => {
  try {
    const actor = await requireSession();
    const invitations = await invitationService.listForActor(actor);

    return apiSuccess(invitations);
  } catch (error) {
    return handleApiError(error);
  }
};

export const POST = async (request: Request) => {
  try {
    const actor = await requireSession();
    const payload = await request.json();
    const parsedPayload = createInvitationSchema.safeParse(payload);

    if (!parsedPayload.success) {
      throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", parsedPayload.error.flatten());
    }

    const createdInvitation = await invitationService.create(actor, parsedPayload.data);

    return apiSuccess(createdInvitation, {
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
};
