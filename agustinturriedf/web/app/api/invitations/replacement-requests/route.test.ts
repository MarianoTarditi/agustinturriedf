import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestReplacementMock, consumeThrottleMock } = vi.hoisted(() => ({
  requestReplacementMock: vi.fn(),
  consumeThrottleMock: vi.fn(),
}));

vi.mock("@/features/invitations/service", () => ({
  invitationService: { requestReplacement: requestReplacementMock },
}));

vi.mock("@/features/auth/password-reset/throttle", () => ({
  passwordResetThrottle: { consume: consumeThrottleMock },
}));

import { POST } from "@/app/api/invitations/replacement-requests/route";
import { PASSWORD_RESET_REQUEST_MIN_DURATION_MS } from "@/app/api/password-reset/contract";

const request = (email: string, headers?: HeadersInit) => new Request("http://localhost/api/invitations/replacement-requests", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify({ email }),
});

describe("POST /api/invitations/replacement-requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    consumeThrottleMock.mockResolvedValue(true);
  });

  it("returns the identical generic 202 response for eligible, unknown, throttled, and failed requests", async () => {
    requestReplacementMock.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("outbox unavailable"));
    consumeThrottleMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const responses = await Promise.all([
      POST(request("eligible@example.com")),
      POST(request("unknown@example.com")),
      POST(request("throttled@example.com")),
      POST(request("failed@example.com")),
    ]);
    const bodies = await Promise.all(responses.map((response) => response.json()));

    expect(responses.map((response) => response.status)).toEqual([202, 202, 202, 202]);
    expect(bodies.every((body) => JSON.stringify(body) === JSON.stringify(bodies[0]))).toBe(true);
    expect(requestReplacementMock).toHaveBeenCalledTimes(3);
  });

  it("uses the conservative shared bucket regardless of caller-controlled forwarding headers", async () => {
    await POST(request("first@example.com", { "x-forwarded-for": "203.0.113.1" }));
    await POST(request("second@example.com", { "x-real-ip": "198.51.100.1" }));

    expect(consumeThrottleMock).toHaveBeenNthCalledWith(1, "invitation-replacement-public-shared");
    expect(consumeThrottleMock).toHaveBeenNthCalledWith(2, "invitation-replacement-public-shared");
  });

  it.each(["eligible", "unknown", "throttled", "internal failure"])("normalizes the %s branch to the minimum response duration", async (branch) => {
    vi.useFakeTimers();
    if (branch === "throttled") consumeThrottleMock.mockResolvedValue(false);
    if (branch === "internal failure") requestReplacementMock.mockRejectedValue(new Error("outbox unavailable"));
    const responsePromise = POST(request(`${branch.replaceAll(" ", "-")}@example.com`));
    let settled = false;
    responsePromise.then(() => { settled = true; });

    await vi.advanceTimersByTimeAsync(PASSWORD_RESET_REQUEST_MIN_DURATION_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    await expect(responsePromise).resolves.toMatchObject({ status: 202 });
  });

  it("does not disclose malformed input", async () => {
    const response = await POST(request("not-an-email"));

    expect(response.status).toBe(202);
    expect(requestReplacementMock).not.toHaveBeenCalled();
  });
});
