import { describe, expect, it, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn((handler: unknown) => handler),
}));

vi.mock("@/auth-edge", () => ({
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

  it("redirects admin-blocked student sessions to login AccountBlocked", async () => {
    const response = (await middleware({
      nextUrl: new URL("http://localhost/usuarios"),
      auth: {
        user: {
          role: "STUDENT",
          accessBlockReason: "ADMIN_BLOCKED",
        },
      },
    } as never, {} as never)) as Response;

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("error=AccountBlocked");
  });

  it("redirects payment-overdue student sessions to login PaymentOverdue", async () => {
    const response = (await middleware({
      nextUrl: new URL("http://localhost/usuarios"),
      auth: {
        user: {
          role: "STUDENT",
          accessBlockReason: "PAYMENT_OVERDUE",
        },
      },
    } as never, {} as never)) as Response;

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("error=PaymentOverdue");
  });

  it("allows authenticated non-blocked users on private routes", async () => {
    const response = (await middleware({
      nextUrl: new URL("http://localhost/usuarios"),
      auth: {
        user: {
          role: "TRAINER",
          accessBlockReason: undefined,
        },
      },
    } as never, {} as never)) as Response;

    expect(response.status).toBe(200);
  });
});

void middleware;
