import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig as edgeAuthConfig } from "@/auth.config";
import { authorizeCredentials } from "@/features/auth/credentials";
import {
  isTokenIssuedBeforePasswordUpdate,
  toPasswordUpdatedAtIso,
} from "@/features/auth/password-updated-at";
import { prisma } from "@/lib/prisma";

export const authConfig = {
  ...edgeAuthConfig,
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
    ...edgeAuthConfig.callbacks,
    jwt: async (params) => {
      const edgeToken = await edgeAuthConfig.callbacks?.jwt?.(params);

      if (!edgeToken || params.user || !edgeToken.sub) {
        return edgeToken;
      }

      const prismaAuth = prisma as any;
      const authUser = (await prismaAuth.user.findUnique({
        where: { id: edgeToken.sub },
        select: { passwordUpdatedAt: true },
      })) as { passwordUpdatedAt?: Date | null } | null;

      const passwordUpdatedAtIso = toPasswordUpdatedAtIso(authUser?.passwordUpdatedAt);

      if (isTokenIssuedBeforePasswordUpdate(edgeToken.iat, passwordUpdatedAtIso)) {
        return null;
      }

      if (passwordUpdatedAtIso) {
        edgeToken.passwordUpdatedAt = passwordUpdatedAtIso;
      }

      return edgeToken;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
