import { beforeEach, describe, expect, it, vi } from "vitest";

const { activateMock } = vi.hoisted(() => ({
  activateMock: vi.fn(),
}));

vi.mock("@/features/invitations/service", () => ({
  invitationService: {
    activate: activateMock,
  },
}));

import { ACTIVATION_SUCCESS_MESSAGE, POST } from "@/app/api/activations/route";

describe("POST /api/activations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success when activation payload is valid", async () => {
    activateMock.mockResolvedValue({ message: ACTIVATION_SUCCESS_MESSAGE });

    const response = await POST(
      new Request("http://localhost/api/activations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: "tok_1",
          password: "Segura123",
          confirmPassword: "Segura123",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: { message: ACTIVATION_SUCCESS_MESSAGE },
    });
  });

  it("returns 400 when activation payload is invalid", async () => {
    const response = await POST(
      new Request("http://localhost/api/activations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: "",
          password: "123",
          confirmPassword: "123",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Validation failed" },
    });
  });
});
