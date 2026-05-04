import { invitationService } from "@/features/invitations/service";
import { handleApiError } from "@/lib/http/api-response";
import { activateInvitationSchema } from "@/lib/validation/invitations";

import {
  ACTIVATION_SUCCESS_MESSAGE,
  activationSuccessResponse,
  createActivationValidationError,
} from "@/app/api/activations/contract";

export const POST = async (request: Request) => {
  try {
    // SECURITY BOUNDARY: this route is public by design.
    // Authorization is replaced by possession of a valid, unexpired single-use token.
    const payload = await request.json();
    const parsedPayload = activateInvitationSchema.safeParse(payload);

    if (!parsedPayload.success) {
      throw createActivationValidationError(parsedPayload.error.flatten());
    }

    await invitationService.activate(parsedPayload.data);
    return activationSuccessResponse();
  } catch (error) {
    return handleApiError(error);
  }
};

export { ACTIVATION_SUCCESS_MESSAGE };
