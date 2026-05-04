import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, resendMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  resendMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({ requireSession: requireSessionMock }));
vi.mock("@/features/invitations/service", () => ({
  invitationService: {
    resend: resendMock,
  },
}));

import { POST } from "@/app/api/invitations/[invitationId]/resend/route";

describe("POST /api/invitations/[invitationId]/resend", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resends invitation and returns updated invitation", async () => {
    requireSessionMock.mockResolvedValue({ id: "t1", role: "TRAINER" });
    resendMock.mockResolvedValue({ id: "inv-1", status: "SENT" });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ invitationId: "inv-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: { id: "inv-1", status: "SENT" } });
  });
});
