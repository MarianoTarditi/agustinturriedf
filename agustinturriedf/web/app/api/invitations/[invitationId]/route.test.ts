import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, findByIdForActorMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  findByIdForActorMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({ requireSession: requireSessionMock }));
vi.mock("@/features/invitations/service", () => ({
  invitationService: {
    findByIdForActor: findByIdForActorMock,
  },
}));

import * as invitationDetailRoute from "@/app/api/invitations/[invitationId]/route";

const { GET } = invitationDetailRoute;

describe("/api/invitations/[invitationId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET returns invitation detail", async () => {
    requireSessionMock.mockResolvedValue({ id: "t1", role: "TRAINER" });
    findByIdForActorMock.mockResolvedValue({ id: "inv-1" });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ invitationId: "inv-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: { id: "inv-1" } });
  });

  it("does not expose DELETE on the read-only detail route", () => {
    expect("DELETE" in invitationDetailRoute).toBe(false);
  });
});
