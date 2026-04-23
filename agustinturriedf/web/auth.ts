import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authorizeCredentials } from "@/features/auth/credentials";

const ROLES = ["ADMIN", "TRAINER", "STUDENT"] as const;
const STUDENT_STATUSES = ["ACTIVE", "INACTIVE", "BLOCKED"] as const;
const PAYMENT_STATUSES = ["CURRENT", "OVERDUE", "NO_CYCLE"] as const;
const ACCESS_BLOCK_REASONS = ["ADMIN_INACTIVE", "ADMIN_BLOCKED", "PAYMENT_OVERDUE"] as const;

const isRole = (value: unknown): value is (typeof ROLES)[number] =>
  typeof value === "string" && ROLES.includes(value as (typeof ROLES)[number]);

const isStudentStatus = (value: unknown): value is (typeof STUDENT_STATUSES)[number] =>
  typeof value === "string" && STUDENT_STATUSES.includes(value as (typeof STUDENT_STATUSES)[number]);

const isPaymentStatus = (value: unknown): value is (typeof PAYMENT_STATUSES)[number] =>
  typeof value === "string" && PAYMENT_STATUSES.includes(value as (typeof PAYMENT_STATUSES)[number]);

const isAccessBlockReason = (value: unknown): value is (typeof ACCESS_BLOCK_REASONS)[number] =>
  typeof value === "string" && ACCESS_BLOCK_REASONS.includes(value as (typeof ACCESS_BLOCK_REASONS)[number]);

export const authConfig = {

  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        return authorizeCredentials(credentials);
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.studentStatus = user.studentStatus;
        token.studentProfileId = user.studentProfileId;
        token.trainerId = user.trainerId;
        token.paymentStatus = user.paymentStatus;
        token.accessBlockReason = user.accessBlockReason;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (!session.user || !token.sub || !isRole(token.role)) {
        return session;
      }

      session.user.id = token.sub;
      session.user.role = token.role;
      session.user.studentStatus = isStudentStatus(token.studentStatus)
        ? token.studentStatus
        : undefined;
      session.user.studentProfileId =
        typeof token.studentProfileId === "string" ? token.studentProfileId : undefined;
      session.user.trainerId = typeof token.trainerId === "string" ? token.trainerId : undefined;
      session.user.paymentStatus = isPaymentStatus(token.paymentStatus)
        ? token.paymentStatus
        : undefined;
      session.user.accessBlockReason = isAccessBlockReason(token.accessBlockReason)
        ? token.accessBlockReason
        : undefined;

      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
