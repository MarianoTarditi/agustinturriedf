import { requireSession } from "@/features/auth/session";
import { userService } from "@/features/users/service";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";

export const GET = async () => {
  try {
    const actor = await requireSession();
    const users = await userService.listUsers(actor);

    return apiSuccess(users);
  } catch (error) {
    return handleApiError(error);
  }
};

export const POST = async (_request: Request) => new Response(null, { status: 405, headers: { Allow: "GET" } });
