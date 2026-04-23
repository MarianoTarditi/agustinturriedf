import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";

import { auth } from "@/auth";

const PRIVATE_PATH_PREFIXES = [
  "/dashboard",
  "/usuarios",
  "/rutinas",
  "/pagos",
  "/videoteca",
  "/perfil",
];

const isPrivatePath = (pathname: string) =>
  PRIVATE_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export default auth((request: NextAuthRequest) => {
  const { nextUrl } = request;

  if (!isPrivatePath(nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (!request.auth?.user) {
    const signInUrl = new URL("/login", nextUrl);
    signInUrl.searchParams.set("callbackUrl", `${nextUrl.pathname}${nextUrl.search}`);
    return NextResponse.redirect(signInUrl);
  }

  if (request.auth.user.role === "STUDENT" && request.auth.user.accessBlockReason) {
    const blockedUrl = new URL("/login", nextUrl);
    blockedUrl.searchParams.set(
      "error",
      request.auth.user.accessBlockReason === "PAYMENT_OVERDUE" ? "PaymentOverdue" : "AccountBlocked"
    );
    return NextResponse.redirect(blockedUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/usuarios/:path*",
    "/rutinas/:path*",
    "/pagos/:path*",
    "/videoteca/:path*",
    "/perfil/:path*",
  ],
};
