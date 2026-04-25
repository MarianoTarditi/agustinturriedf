import { beforeEach, describe, expect, it, vi } from "vitest";

const { nextAuthMock, findUniqueMock } = vi.hoisted(() => ({
  nextAuthMock: vi.fn(() => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
  findUniqueMock: vi.fn(),
}));

vi.mock("next-auth", () => ({
  default: nextAuthMock,
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: (config: unknown) => config,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock,
    },
  },
}));

import { authConfig } from "@/auth";

describe("authConfig callbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates active jwt sessions when iat is older than passwordUpdatedAt", async () => {
    findUniqueMock.mockResolvedValue({
      passwordUpdatedAt: new Date("2026-01-01T10:00:00.000Z"),
    });

    const jwtCallback = authConfig.callbacks?.jwt;
    const result = await jwtCallback?.({
      token: {
        sub: "user-1",
        iat: Math.floor(new Date("2025-12-01T10:00:00.000Z").getTime() / 1000),
      },
      user: undefined,
    } as never);

    expect(result).toBeNull();
  });

  it("keeps jwt session valid when iat is newer than passwordUpdatedAt", async () => {
    findUniqueMock.mockResolvedValue({
      passwordUpdatedAt: new Date("2026-01-01T10:00:00.000Z"),
    });

    const token = {
      sub: "user-1",
      iat: Math.floor(new Date("2026-02-01T10:00:00.000Z").getTime() / 1000),
    };

    const jwtCallback = authConfig.callbacks?.jwt;
    const result = await jwtCallback?.({
      token,
      user: undefined,
    } as never);

    expect(result).toEqual(token);
  });

  it("stores passwordUpdatedAt into token on successful sign-in", async () => {
    const jwtCallback = authConfig.callbacks?.jwt;

    const result = await jwtCallback?.({
      token: {},
      user: {
        id: "user-1",
        role: "ADMIN",
        passwordUpdatedAt: "2026-02-01T10:00:00.000Z",
      },
    } as never);

    expect(result).toMatchObject({
      sub: "user-1",
      role: "ADMIN",
      passwordUpdatedAt: "2026-02-01T10:00:00.000Z",
    });
  });
});
