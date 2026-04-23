import { auth } from "@/auth";
import { evaluatePaymentAccess } from "@/features/auth/payment-access";
import { type AuthenticatedUser } from "@/features/auth/authorization";
import { ApiError } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";

export const requireSession = async (): Promise<AuthenticatedUser> => {
  const session = await auth();

  if (!session?.user?.id || !session.user.role) {
    throw new ApiError("No autenticado", 401, "UNAUTHORIZED");
  }

  const prismaAuth = prisma as any;

  const currentUser = (await prismaAuth.user.findUnique({
    where: {
      id: session.user.id,
    },
    include: {
      studentProfile: {
        include: {
          currentPayment: true,
        },
      },
    },
  })) as
    | {
        id: string;
        role: "ADMIN" | "TRAINER" | "STUDENT";
        studentProfile?: {
          id: string;
          trainerId: string;
          status: "ACTIVE" | "INACTIVE" | "BLOCKED";
          currentPayment?: {
            dueDate: Date;
          } | null;
        } | null;
      }
    | null;

  if (!currentUser) {
    throw new ApiError("Sesión inválida", 401, "UNAUTHORIZED");
  }

  const paymentAccess = evaluatePaymentAccess({
    role: currentUser.role,
    studentStatus: currentUser.studentProfile?.status,
    currentPaymentDueDate: currentUser.studentProfile?.currentPayment?.dueDate,
  });

  if (!paymentAccess.canAccess) {
    if (paymentAccess.accessBlockReason === "PAYMENT_OVERDUE") {
      throw new ApiError("Pago vencido. Regularizá tu cuota para continuar", 403, "PAYMENT_REQUIRED");
    }

    throw new ApiError("Cuenta bloqueada", 403, "FORBIDDEN");
  }

  return {
    ...session.user,
    id: currentUser.id,
    role: currentUser.role,
    studentStatus: currentUser.studentProfile?.status,
    studentProfileId: currentUser.studentProfile?.id,
    trainerId: currentUser.studentProfile?.trainerId,
    paymentStatus: paymentAccess.paymentStatus,
    accessBlockReason: paymentAccess.accessBlockReason,
  } satisfies AuthenticatedUser;
};
