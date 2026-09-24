import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, requestResetForActorMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  requestResetForActorMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({ requireSession: requireSessionMock }));
vi.mock("@/features/auth/password-reset/service", () => ({
  passwordResetService: { requestResetForActor: requestResetForActorMock },
}));

import { POST } from "@/app/api/users/[userId]/password-reset/route";

describe("POST /api/users/[userId]/password-reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  });

  it("returns only an accepted status and never exposes reset material", async () => {
    requestResetForActorMock.mockResolvedValue({ message: "Solicitud de recuperación aceptada." });

    const response = await POST(new Request("http://localhost/api/users/target-1/password-reset", {
      method: "POST",
      body: JSON.stringify({ password: "operator-chosen", token: "raw-reset-bearer" }),
    }), { params: Promise.resolve({ userId: "target-1" }) });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { message: "Solicitud de recuperación aceptada." },
    });
    expect(requestResetForActorMock).toHaveBeenCalledWith({ id: "admin-1", role: "ADMIN" }, "target-1");
  });
});
