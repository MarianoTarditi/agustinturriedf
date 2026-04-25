import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestResetMock } = vi.hoisted(() => ({
  requestResetMock: vi.fn(),
}));

vi.mock("@/features/auth/password-reset/service", () => ({
  passwordResetService: {
    requestReset: requestResetMock,
  },
}));

import {
  PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
  PASSWORD_RESET_REQUEST_MIN_DURATION_MS,
  POST,
} from "@/app/api/password-reset/request/route";

describe("POST /api/password-reset/request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("returns identical generic 200 response for existing and non-existing emails", async () => {
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

    expect(existingResponse.status).toBe(200);
    expect(missingResponse.status).toBe(200);
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

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        message: PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
      },
    });
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
