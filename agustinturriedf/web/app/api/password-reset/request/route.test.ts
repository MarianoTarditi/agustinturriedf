import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestResetMock } = vi.hoisted(() => ({
  requestResetMock: vi.fn(),
}));

const { consumeThrottleMock } = vi.hoisted(() => ({
  consumeThrottleMock: vi.fn(),
}));

vi.mock("@/features/auth/password-reset/service", () => ({
  passwordResetService: {
    requestReset: requestResetMock,
  },
}));

vi.mock("@/features/auth/password-reset/throttle", () => ({
  passwordResetThrottle: { consume: consumeThrottleMock },
}));

import {
  PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
  PASSWORD_RESET_REQUEST_MIN_DURATION_MS,
} from "@/app/api/password-reset/contract";
import { POST } from "@/app/api/password-reset/request/route";

describe("POST /api/password-reset/request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    consumeThrottleMock.mockResolvedValue(true);
  });

  it("returns identical generic 202 response for existing and non-existing emails", async () => {
    requestResetMock.mockResolvedValueOnce({ message: "custom-existing" });
    requestResetMock.mockResolvedValueOnce({ message: "custom-missing" });

    const existingRequest = new Request("http://localhost/api/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com" }),
    });

    const missingRequest = new Request("http://localhost/api/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "missing@example.com" }),
    });

    const existingResponse = await POST(existingRequest);
    const missingResponse = await POST(missingRequest);

    const existingBody = await existingResponse.json();
    const missingBody = await missingResponse.json();

    expect(existingResponse.status).toBe(202);
    expect(missingResponse.status).toBe(202);
    expect(existingBody).toEqual({
      success: true,
      data: {
        message: PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
      },
    });
    expect(missingBody).toEqual(existingBody);
    expect(requestResetMock).toHaveBeenNthCalledWith(1, "user@example.com");
    expect(requestResetMock).toHaveBeenNthCalledWith(2, "missing@example.com");
  });

  it("normalizes timing by waiting minimum response duration", async () => {
    vi.useFakeTimers();
    requestResetMock.mockResolvedValue({ message: "ignored" });

    const request = new Request("http://localhost/api/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com" }),
    });

    let settled = false;
    const responsePromise = POST(request).then((response) => {
      settled = true;
      return response;
    });

    await vi.advanceTimersByTimeAsync(PASSWORD_RESET_REQUEST_MIN_DURATION_MS - 1);
    await Promise.resolve();

    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const response = await responsePromise;
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({
      success: true,
      data: {
        message: PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
      },
    });
  });

  it("keeps a generic 202 response when throttled or internal reset delivery fails", async () => {
    consumeThrottleMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    requestResetMock.mockRejectedValueOnce(new Error("outbox unavailable"));

    const throttled = await POST(new Request("http://localhost/api/password-reset/request", {
      method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.1" }, body: JSON.stringify({ email: "user@example.com" }),
    }));
    const failed = await POST(new Request("http://localhost/api/password-reset/request", {
      method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.2" }, body: JSON.stringify({ email: "user@example.com" }),
    }));

    expect(throttled.status).toBe(202);
    expect(failed.status).toBe(202);
    await expect(throttled.json()).resolves.toEqual(await failed.clone().json());
    expect(requestResetMock).toHaveBeenCalledTimes(1);
    expect(consumeThrottleMock).toHaveBeenNthCalledWith(1, "password-reset-public-shared");
  });

  it("uses one shared bucket despite missing or spoofed forwarding headers", async () => {
    for (const headers of [
      new Headers(),
      new Headers({ "x-forwarded-for": "203.0.113.1, 198.51.100.1" }),
      new Headers({ "x-real-ip": "198.51.100.2" }),
      new Headers({ "x-forwarded-for": "198.51.100.3", "x-real-ip": "198.51.100.4" }),
    ]) {
      headers.set("Content-Type", "application/json");
      await POST(new Request("http://localhost/api/password-reset/request", {
        method: "POST", headers, body: JSON.stringify({ email: "user@example.com" }),
      }));
    }

    expect(consumeThrottleMock).toHaveBeenCalledTimes(4);
    expect(consumeThrottleMock).toHaveBeenNthCalledWith(1, "password-reset-public-shared");
    expect(consumeThrottleMock).toHaveBeenNthCalledWith(2, "password-reset-public-shared");
    expect(consumeThrottleMock).toHaveBeenNthCalledWith(3, "password-reset-public-shared");
    expect(consumeThrottleMock).toHaveBeenNthCalledWith(4, "password-reset-public-shared");
  });

  it("returns 400 validation error when email payload is invalid", async () => {
    const request = new Request("http://localhost/api/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid-email" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
      },
    });
    expect(requestResetMock).not.toHaveBeenCalled();
  });
});
