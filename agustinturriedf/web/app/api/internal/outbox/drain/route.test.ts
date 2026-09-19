import { beforeEach, describe, expect, it, vi } from "vitest";

const { drain, redrive } = vi.hoisted(() => ({ drain: vi.fn(), redrive: vi.fn() }));
vi.mock("@/features/outbox/worker", () => ({ createProductionOutboxWorker: () => ({ drain }) }));
vi.mock("@/features/outbox/repository", () => ({ outboxRepository: { redrive } }));

import { POST, PATCH } from "./route";

describe("internal outbox drain", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("OUTBOX_DRAIN_SECRET", "synthetic-control-secret"); });
  it("returns the same denial without looking up work for missing, short, long, or wrong credentials", async () => {
    const responses = await Promise.all([undefined, "x", "x".repeat(100), "wrong"].map(async (token) => {
      const headers = token === undefined ? {} : { authorization: `Bearer ${token}` };
      return (await POST(new Request("http://localhost/api/internal/outbox/drain", { method: "POST", headers: headers as Record<string, string> }))).text();
    }));
    expect(new Set(responses).size).toBe(1);
    expect(drain).not.toHaveBeenCalled();
  });
  it("runs authorized drains and returns only the bounded redrive outcome", async () => {
    drain.mockResolvedValue({ claimed: 1 }); redrive.mockResolvedValue({ kind: "PAYLOAD_PURGED" });
    const headers = { authorization: "Bearer synthetic-control-secret" };
    expect((await POST(new Request("http://localhost/api/internal/outbox/drain", { method: "POST", headers }))).status).toBe(200);
    const response = await PATCH(new Request("http://localhost/api/internal/outbox/drain", { method: "PATCH", headers, body: JSON.stringify({ id: "job-1" }) }));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ result: "PAYLOAD_PURGED" });
    expect(redrive).toHaveBeenCalledWith("job-1");
  });
});
