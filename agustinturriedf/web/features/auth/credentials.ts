import { compare } from "bcryptjs";

import { evaluatePaymentAccess } from "@/features/auth/payment-access";
import { prisma } from "@/lib/prisma";

type RawCredentials = Partial<Record<"email" | "password", unknown>> | undefined;

export const authorizeCredentials = async (credentials: RawCredentials) => {
  const email = credentials?.email;
  const password = credentials?.password;

  if (typeof email !== "string" || typeof password !== "string") {
    return null;
  }

  const prismaAuth = prisma as any;

  const user = (await prismaAuth.user.findUnique({
    where: { email: email.toLowerCase().trim() },
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
        email: string;
        firstName: string;
        lastName: string;
        photoUrl: string | null;
        passwordHash: string;
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

  if (!user) {
    return null;
  }

  const passwordMatches = await compare(password, user.passwordHash);

  if (!passwordMatches) {
    return null;
  }

  const paymentAccess = evaluatePaymentAccess({
    role: user.role,
    studentStatus: user.studentProfile?.status,
    currentPaymentDueDate: user.studentProfile?.currentPayment?.dueDate,
  });

  if (!paymentAccess.canAccess) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`.trim(),
    image: user.photoUrl ?? null,
    role: user.role,
    studentStatus: user.studentProfile?.status,
    studentProfileId: user.studentProfile?.id,
    trainerId: user.studentProfile?.trainerId,
    paymentStatus: paymentAccess.paymentStatus,
    accessBlockReason: paymentAccess.accessBlockReason,
  };
};
