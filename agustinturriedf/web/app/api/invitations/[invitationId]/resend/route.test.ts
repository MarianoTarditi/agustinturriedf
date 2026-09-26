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
    const invitationId = "c123456789012345678901234";
    resendMock.mockResolvedValue({ id: invitationId, status: "SENT" });

    const response = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ expectedVersion: 1 }),
    }), {
      params: Promise.resolve({ invitationId }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: { id: invitationId, status: "SENT" } });
    expect(resendMock).toHaveBeenCalledWith(invitationId, expect.any(Object), 1);
  });
});
