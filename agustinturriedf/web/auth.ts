import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authorizeCredentials } from "@/features/auth/credentials";

const ROLES = ["ADMIN", "TRAINER", "STUDENT"] as const;
const STUDENT_STATUSES = ["ACTIVE", "INACTIVE", "BLOCKED"] as const;

const isRole = (value: unknown): value is (typeof ROLES)[number] =>
  typeof value === "string" && ROLES.includes(value as (typeof ROLES)[number]);

const isStudentStatus = (value: unknown): value is (typeof STUDENT_STATUSES)[number] =>
  typeof value === "string" && STUDENT_STATUSES.includes(value as (typeof STUDENT_STATUSES)[number]);

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

      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
