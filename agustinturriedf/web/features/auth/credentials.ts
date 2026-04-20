import { compare } from "bcryptjs";

import { prisma } from "@/lib/prisma";

type RawCredentials = Partial<Record<"email" | "password", unknown>> | undefined;

export const authorizeCredentials = async (credentials: RawCredentials) => {
  const email = credentials?.email;
  const password = credentials?.password;

  if (typeof email !== "string" || typeof password !== "string") {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: {
      studentProfile: true,
    },
  });

  if (!user) {
    return null;
  }

  const passwordMatches = await compare(password, user.passwordHash);

  if (!passwordMatches) {
    return null;
  }

  if (user.role === "STUDENT" && user.studentProfile?.status === "BLOCKED") {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`.trim(),
    role: user.role,
    studentStatus: user.studentProfile?.status,
    studentProfileId: user.studentProfile?.id,
    trainerId: user.studentProfile?.trainerId,
  };
};
