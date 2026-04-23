import type { Session } from "next-auth";

import type { AccessBlockReason, PaymentStatus } from "@/features/auth/payment-access";
import { ApiError } from "@/lib/http/api-response";

type Role = "ADMIN" | "TRAINER" | "STUDENT";

export type AuthenticatedUser = Session["user"] & {
  id: string;
  role: Role;
  studentStatus?: "ACTIVE" | "INACTIVE" | "BLOCKED";
  studentProfileId?: string;
  trainerId?: string;
  paymentStatus?: PaymentStatus;
  accessBlockReason?: AccessBlockReason;
};

export const hasRole = (user: AuthenticatedUser, allowedRoles: readonly Role[]) =>
  allowedRoles.includes(user.role);

export const requireRole = (
  user: AuthenticatedUser,
  allowedRoles: readonly Role[],
  errorMessage = "No tenés permisos para esta acción"
) => {
  if (!hasRole(user, allowedRoles)) {
    throw new ApiError(errorMessage, 403, "FORBIDDEN");
  }
};

export const isOwner = (user: AuthenticatedUser, ownerUserId: string) => user.id === ownerUserId;

export const canAccessUserResource = (user: AuthenticatedUser, ownerUserId: string) =>
  hasRole(user, ["ADMIN", "TRAINER"]) || isOwner(user, ownerUserId);

export const requireOwnershipOrRole = (
  user: AuthenticatedUser,
  ownerUserId: string,
  allowedRoles: readonly Role[] = ["ADMIN", "TRAINER"],
  errorMessage = "No tenés permisos para acceder a este recurso"
) => {
  if (!hasRole(user, allowedRoles) && !isOwner(user, ownerUserId)) {
    throw new ApiError(errorMessage, 403, "FORBIDDEN");
  }
};
