import { requireSession } from "@/features/auth/session";
import { userService } from "@/features/users/service";
import { ApiError, apiSuccess, handleApiError } from "@/lib/http/api-response";
import { userDirectoryQuerySchema } from "@/lib/validation/users";

export const GET = async (request: Request) => {
  try {
    const actor = await requireSession();
    const searchParams = new URL(request.url).searchParams;

    if (searchParams.size === 0) {
      return apiSuccess(await userService.listUsers(actor));
    }

    const query = userDirectoryQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!query.success) {
      throw new ApiError("Validation failed", 400, "VALIDATION_ERROR", query.error.flatten());
    }

    const users = await userService.listDirectory(actor, query.data);

    return apiSuccess(users);
  } catch (error) {
    return handleApiError(error);
  }
};

export const POST = async (_request: Request) => new Response(null, { status: 405, headers: { Allow: "GET" } });
