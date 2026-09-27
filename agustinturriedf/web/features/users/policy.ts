import type { AuthenticatedUser } from "@/features/auth/authorization";
import { ApiError } from "@/lib/http/api-response";

type UserTarget = {
  id: string;
  role: "ADMIN" | "TRAINER" | "STUDENT";
};

export const isActiveAccount = (status: "ACTIVE" | "INACTIVE" | "BLOCKED" | "ARCHIVED") =>
  status === "ACTIVE";

export const canReadUser = (actor: AuthenticatedUser, target: UserTarget) =>
  actor.role === "ADMIN" || (actor.role === "TRAINER" && target.role === "STUDENT");

export const requireUserReadAccess = (actor: AuthenticatedUser, target: UserTarget) => {
  if (!canReadUser(actor, target)) {
    throw new ApiError("No tenés permisos para ver este usuario", 403, "FORBIDDEN");
  }
};

export const requireUserMutationAccess = (actor: AuthenticatedUser, target: UserTarget) => {
  if (actor.role !== "ADMIN" && !(actor.role === "TRAINER" && target.role === "STUDENT")) {
    throw new ApiError("No tenés permisos para actualizar este usuario", 403, "FORBIDDEN");
  }
};

export const requireUserDirectoryAccess = (actor: AuthenticatedUser) => {
  if (actor.role !== "ADMIN" && actor.role !== "TRAINER") {
    throw new ApiError("Solo ADMIN y TRAINER pueden listar usuarios", 403, "FORBIDDEN");
  }
};
