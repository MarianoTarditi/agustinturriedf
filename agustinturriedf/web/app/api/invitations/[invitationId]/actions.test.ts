import { describe, expect, it, vi } from "vitest";

const { requireSessionMock, resendMock, revokeMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  resendMock: vi.fn(),
  revokeMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({ requireSession: requireSessionMock }));
vi.mock("@/features/invitations/service", () => ({
  invitationService: { resend: resendMock, revoke: revokeMock },
}));

import { POST } from "./resend/route";
import { DELETE } from "./revoke/route";
import * as invitationDetailRoute from "./route";

const context = { params: Promise.resolve({ invitationId: "c123456789012345678901234" }) };

describe("invitation action routes", () => {
  it("rejects an invalid resend version before invoking the service", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    const response = await POST(new Request("http://localhost/api/invitations/id/resend", { method: "POST", body: JSON.stringify({ expectedVersion: 0 }) }), context);

    expect(response.status).toBe(400);
    expect(resendMock).not.toHaveBeenCalled();
  });

  it("passes validated resend and explicit revoke commands to the authorized service boundary", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    resendMock.mockResolvedValue({ id: "c123456789012345678901234", version: 2 });
    revokeMock.mockResolvedValue({ id: "c123456789012345678901234", status: "REVOKED", version: 2 });

    const resendResponse = await POST(new Request("http://localhost/api/invitations/id/resend", { method: "POST", body: JSON.stringify({ expectedVersion: 1 }) }), context);
    const revokeResponse = await DELETE(new Request("http://localhost/api/invitations/id/revoke", { method: "DELETE", body: JSON.stringify({ expectedVersion: 1, reason: "Duplicate request" }) }), context);

    expect(resendResponse.status).toBe(200);
    expect(revokeResponse.status).toBe(200);
    expect(resendMock).toHaveBeenCalledWith("c123456789012345678901234", expect.any(Object), 1);
    expect(revokeMock).toHaveBeenCalledWith("c123456789012345678901234", expect.any(Object), { invitationId: "c123456789012345678901234", expectedVersion: 1, reason: "Duplicate request" });
  });

  it("keeps invitation detail read-only", () => {
    expect("DELETE" in invitationDetailRoute).toBe(false);
  });
});
