import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, listForActorMock, createMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  listForActorMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({ requireSession: requireSessionMock }));
vi.mock("@/features/invitations/service", () => ({
  invitationService: { listForActor: listForActorMock, create: createMock },
}));

import { GET, POST } from "@/app/api/invitations/route";

describe("/api/invitations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET returns invitation list", async () => {
    requireSessionMock.mockResolvedValue({ id: "t1", role: "TRAINER" });
    listForActorMock.mockResolvedValue([{ id: "inv-1" }]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: [{ id: "inv-1" }] });
  });

  it("POST returns created invitation", async () => {
    requireSessionMock.mockResolvedValue({ id: "t1", role: "TRAINER" });
    createMock.mockResolvedValue({ id: "inv-1" });

    const response = await POST(
      new Request("http://localhost/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Ana",
          lastName: "Gomez",
          email: "ana@example.com",
          trainerId: "c123456789012345678901234",
          initialPaymentStartDate: "2026-05-01",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ success: true, data: { id: "inv-1" } });
  });
});
