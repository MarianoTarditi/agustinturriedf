import { describe, expect, it } from "vitest";

import {
  activateInvitationSchema,
  createInvitationSchema,
  resendInvitationSchema,
} from "@/lib/validation/invitations";

describe("invitation validation schemas", () => {
  it("accepts invitation payload with required student data", () => {
    const parsed = createInvitationSchema.parse({
      firstName: "Ana",
      lastName: "Gomez",
      email: " ANA@EXAMPLE.COM ",
      trainerId: "c123456789012345678901234",
      initialPaymentStartDate: "2026-04-30",
    });

    expect(parsed.email).toBe("ana@example.com");
    expect(parsed.firstName).toBe("Ana");
  });

  it("rejects invitation payload without trainerId", () => {
    expect(() =>
      createInvitationSchema.parse({
        firstName: "Ana",
        lastName: "Gomez",
        email: "ana@example.com",
        initialPaymentStartDate: "2026-04-30",
      })
    ).toThrow();
  });

  it("rejects invitation payload without initialPaymentStartDate", () => {
    expect(() =>
      createInvitationSchema.parse({
        firstName: "Ana",
        lastName: "Gomez",
        email: "ana@example.com",
        trainerId: "c123456789012345678901234",
      })
    ).toThrow();
  });

  it("accepts activation payload with strong password", () => {
    const parsed = activateInvitationSchema.parse({
      token: "tok_123",
      password: "Segura123",
      confirmPassword: "Segura123",
    });

    expect(parsed.token).toBe("tok_123");
  });

  it("rejects activation payload with weak password", () => {
    expect(() =>
      activateInvitationSchema.parse({
        token: "tok_123",
        password: "segura123",
        confirmPassword: "segura123",
      })
    ).toThrow();
  });

  it("rejects activation payload when password confirmation mismatches", () => {
    expect(() =>
      activateInvitationSchema.parse({
        token: "tok_123",
        password: "Segura123",
        confirmPassword: "Segura124",
      })
    ).toThrow();
  });

  it("accepts resend payload with invitationId", () => {
    const parsed = resendInvitationSchema.parse({
      invitationId: "c123456789012345678901234",
    });

    expect(parsed.invitationId).toBe("c123456789012345678901234");
  });
});
