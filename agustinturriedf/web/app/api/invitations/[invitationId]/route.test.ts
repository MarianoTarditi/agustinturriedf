import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, findByIdForActorMock, revokeMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  findByIdForActorMock: vi.fn(),
  revokeMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({ requireSession: requireSessionMock }));
vi.mock("@/features/invitations/service", () => ({
  invitationService: {
    findByIdForActor: findByIdForActorMock,
    revoke: revokeMock,
  },
}));

import { DELETE, GET } from "@/app/api/invitations/[invitationId]/route";

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

  it("DELETE revokes invitation", async () => {
    requireSessionMock.mockResolvedValue({ id: "t1", role: "TRAINER" });
    revokeMock.mockResolvedValue({ message: "Invitación revocada." });

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ invitationId: "inv-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: { message: "Invitación revocada." } });
  });
});
