import { describe, expect, it, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn((handler: unknown) => handler),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import middleware from "@/middleware";

describe("middleware private-route protection", () => {
  it("redirects unauthenticated users to login with callbackUrl", async () => {
    const response = (await middleware({
      nextUrl: new URL("http://localhost/usuarios?tab=active"),
      auth: undefined,
    } as never, {} as never)) as Response;

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("callbackUrl=%2Fusuarios%3Ftab%3Dactive");
  });

  it("redirects blocked student sessions to login AccountBlocked", async () => {
    const response = (await middleware({
      nextUrl: new URL("http://localhost/usuarios"),
      auth: {
        user: {
          role: "STUDENT",
          studentStatus: "BLOCKED",
        },
      },
    } as never, {} as never)) as Response;

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("error=AccountBlocked");
  });

  it("allows authenticated non-blocked users on private routes", async () => {
    const response = (await middleware({
      nextUrl: new URL("http://localhost/usuarios"),
      auth: {
        user: {
          role: "TRAINER",
          studentStatus: undefined,
        },
      },
    } as never, {} as never)) as Response;

    expect(response.status).toBe(200);
  });
});

void middleware;
