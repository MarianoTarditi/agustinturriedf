import { requireSession } from "@/features/auth/session";
import { invitationService } from "@/features/invitations/service";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { createInvitationSchema, invitationQueueQuerySchema } from "@/lib/validation/invitations";

export const GET = async (request: Request) => {
  try {
    const actor = await requireSession();
    const searchParams = new URL(request.url).searchParams;
    if (searchParams.size === 0) return apiSuccess(await invitationService.listForActor(actor));
    const query = invitationQueueQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!query.success) throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", query.error.flatten());
    const invitations = await invitationService.listPageForActor(actor, query.data);

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
