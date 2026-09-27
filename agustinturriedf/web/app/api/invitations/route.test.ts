import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, listForActorMock, listPageForActorMock, createMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  listForActorMock: vi.fn(),
  listPageForActorMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({ requireSession: requireSessionMock }));
vi.mock("@/features/invitations/service", () => ({
  invitationService: { listForActor: listForActorMock, listPageForActor: listPageForActorMock, create: createMock },
}));

import { GET, POST } from "@/app/api/invitations/route";

describe("/api/invitations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET validates and forwards the bounded queue query", async () => {
    requireSessionMock.mockResolvedValue({ id: "t1", role: "TRAINER" });
    listPageForActorMock.mockResolvedValue({ items: [{ id: "inv-1" }], nextCursor: null });

    const response = await GET(new Request("http://localhost/api/invitations?search=ana&status=PENDING&role=STUDENT&limit=2&cursor=signed"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: { items: [{ id: "inv-1" }], nextCursor: null } });
    expect(listPageForActorMock).toHaveBeenCalledWith({ id: "t1", role: "TRAINER" }, expect.objectContaining({ search: "ana", status: "PENDING", role: "STUDENT", limit: 2, cursor: "signed" }));
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
