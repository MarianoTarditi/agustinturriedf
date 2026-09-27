import { NextResponse } from "next/server";

import { activationPrimitives } from "@/features/invitations/activation";

const SESSION_COOKIE = "activation_session";
const SESSION_MAX_AGE_SECONDS = 10 * 60;

const recoveryResponse = (request: Request) => {
  const response = NextResponse.redirect(new URL("/activation?recovery=1", request.url));
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/", sameSite: "lax", secure: true });
  return response;
};

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();

  if (!token) return recoveryResponse(request);

  try {
    const { session } = await activationPrimitives.exchange(token);
    const response = NextResponse.redirect(new URL("/activation", request.url));
    response.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
    return response;
  } catch {
    return recoveryResponse(request);
  }
};
