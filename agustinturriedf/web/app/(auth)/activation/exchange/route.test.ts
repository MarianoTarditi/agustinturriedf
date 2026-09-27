import { beforeEach, describe, expect, it, vi } from "vitest";

const { exchangeMock } = vi.hoisted(() => ({ exchangeMock: vi.fn() }));

vi.mock("@/features/invitations/activation", () => ({
  activationPrimitives: { exchange: exchangeMock },
}));

import { GET } from "@/app/(auth)/activation/exchange/route";

describe("GET /activation/exchange", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exchanges a bearer for a short HttpOnly cookie and redirects to the clean URL", async () => {
    exchangeMock.mockResolvedValue({ session: "opaque-session" });
    const response = await GET(new Request("https://app.example/activation/exchange?token=invite-bearer"));

    expect(exchangeMock).toHaveBeenCalledWith("invite-bearer");
    expect(response.headers.get("location")).toBe("https://app.example/activation");
    expect(response.headers.get("set-cookie")).toMatch(/activation_session=opaque-session;.*Max-Age=600;.*Secure;.*HttpOnly;.*SameSite=Lax/i);
    expect(JSON.stringify([...response.headers])).not.toContain("invite-bearer");
  });

  it("redirects invalid, expired, replayed, and revoked bearers to generic recovery", async () => {
    exchangeMock.mockRejectedValue(new Error("invalid invitation"));
    const response = await GET(new Request("https://app.example/activation/exchange?token=replayed-bearer"));

    expect(response.headers.get("location")).toBe("https://app.example/activation?recovery=1");
    expect(response.headers.get("set-cookie")).toMatch(/activation_session=;.*Max-Age=0/i);
    expect(JSON.stringify([...response.headers])).not.toContain("replayed-bearer");
  });
});
