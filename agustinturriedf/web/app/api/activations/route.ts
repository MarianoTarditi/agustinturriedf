import { cookies } from "next/headers";

import { activationPrimitives } from "@/features/invitations/activation";
import { ApiError, apiError, handleApiError } from "@/lib/http/api-response";
import { activateFromSessionSchema } from "@/lib/validation/invitations";

import {
  activationSuccessResponse,
  createActivationValidationError,
} from "@/app/api/activations/contract";

export const POST = async (request: Request) => {
  try {
    const session = (await cookies()).get("activation_session")?.value;
    if (!session) throw new ApiError("No activation session", 400, "INVALID_ACTIVATION");
    const payload = await request.json();
    const parsedPayload = activateFromSessionSchema.safeParse(payload);

    if (!parsedPayload.success) {
      throw createActivationValidationError(parsedPayload.error.flatten());
    }

    await activationPrimitives.activate({ password: parsedPayload.data.password, session });
    const response = activationSuccessResponse();
    response.cookies.set("activation_session", "", { httpOnly: true, maxAge: 0, path: "/", sameSite: "lax", secure: true });
    return response;
  } catch (error) {
    if (error instanceof ApiError && ["INVALID_ACTIVATION", "INVALID_OR_EXPIRED_TOKEN"].includes(error.code)) {
      const response = apiError(new ApiError("No se pudo continuar con la activación.", 400, "INVALID_ACTIVATION"));
      response.cookies.set("activation_session", "", { httpOnly: true, maxAge: 0, path: "/", sameSite: "lax", secure: true });
      return response;
    }
    return handleApiError(error);
  }
};
