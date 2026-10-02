import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireSession: vi.fn(), getConfig: vi.fn(), updateConfig: vi.fn() }));
vi.mock("@/features/auth/session", () => ({ requireSession: mocks.requireSession }));
vi.mock("@/features/payments/service", () => ({ paymentsService: {
  getGlobalPaymentConfig: mocks.getConfig,
  updateGlobalPaymentConfig: mocks.updateConfig,
} }));

import { GET, PATCH } from "@/app/api/payments/config/route";

describe("/api/payments/config", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns global config read-only to a trainer", async () => {
    mocks.requireSession.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });
    mocks.getConfig.mockResolvedValue({ id: "GLOBAL", defaultMonthlyAmountInCents: 3_000_000, version: 1 });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, data: { defaultMonthlyAmountInCents: 3_000_000, version: 1, canEdit: false } });
  });

  it("allows only an admin to update with a version precondition", async () => {
    mocks.requireSession.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mocks.updateConfig.mockResolvedValue({ id: "GLOBAL", defaultMonthlyAmountInCents: 3_200_000, version: 2 });
    const response = await PATCH(new Request("http://localhost/api/payments/config", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultMonthlyAmountInCents: 3_200_000, expectedVersion: 1 }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.updateConfig).toHaveBeenCalledWith("admin-1", 3_200_000, 1);
  });

  it("rejects trainer writes", async () => {
    mocks.requireSession.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });
    const response = await PATCH(new Request("http://localhost/api/payments/config", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultMonthlyAmountInCents: 3_200_000, expectedVersion: 1 }),
    }));
    expect(response.status).toBe(403);
    expect(mocks.updateConfig).not.toHaveBeenCalled();
  });
});
