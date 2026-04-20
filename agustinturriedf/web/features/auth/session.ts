import { auth } from "@/auth";
import { type AuthenticatedUser } from "@/features/auth/authorization";
import { userRepository } from "@/features/users/repository";
import { ApiError } from "@/lib/http/api-response";

export const requireSession = async (): Promise<AuthenticatedUser> => {
  const session = await auth();

  if (!session?.user?.id || !session.user.role) {
    throw new ApiError("No autenticado", 401, "UNAUTHORIZED");
  }

  const currentUser = await userRepository.findById(session.user.id);

  if (!currentUser) {
    throw new ApiError("Sesión inválida", 401, "UNAUTHORIZED");
  }

  if (currentUser.role === "STUDENT" && currentUser.studentProfile?.status === "BLOCKED") {
    throw new ApiError("Cuenta bloqueada", 403, "FORBIDDEN");
  }

  return {
    ...session.user,
    id: currentUser.id,
    role: currentUser.role,
    studentStatus: currentUser.studentProfile?.status,
    studentProfileId: currentUser.studentProfile?.id,
    trainerId: currentUser.studentProfile?.trainerId,
  } satisfies AuthenticatedUser;
};
