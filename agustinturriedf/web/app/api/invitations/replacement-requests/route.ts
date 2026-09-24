import { invitationService } from "@/features/invitations/service";
import { passwordResetThrottle } from "@/features/auth/password-reset/throttle";
import { apiSuccess } from "@/lib/http/api-response";
import { requestPasswordResetSchema } from "@/lib/validation/password-reset";
import { PASSWORD_RESET_REQUEST_MIN_DURATION_MS } from "@/app/api/password-reset/contract";

const publicThrottleSubject = "invitation-replacement-public-shared";
const genericMessage = "If an eligible invitation exists, replacement instructions will be sent.";

const waitForMinimumResponseDuration = async (startedAtMs: number) => {
  const pendingMs = PASSWORD_RESET_REQUEST_MIN_DURATION_MS - (Date.now() - startedAtMs);
  if (pendingMs > 0) await new Promise((resolve) => setTimeout(resolve, pendingMs));
};

export const POST = async (request: Request) => {
  const startedAt = Date.now();
  try {
    const payload = await request.json();
    const parsedPayload = requestPasswordResetSchema.safeParse(payload);

    if (parsedPayload.success && await passwordResetThrottle.consume(publicThrottleSubject)) {
      await invitationService.requestReplacement(parsedPayload.data.email);
    }
  } catch {
    // Public invitation recovery must not reveal identity, throttle, or delivery state.
  }

  await waitForMinimumResponseDuration(startedAt);
  return apiSuccess({ message: genericMessage }, { status: 202 });
};
