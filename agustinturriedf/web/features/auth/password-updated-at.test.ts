import { describe, expect, it } from "vitest";

import {
  isTokenIssuedBeforePasswordUpdate,
  toPasswordUpdatedAtIso,
} from "@/features/auth/password-updated-at";

describe("password-updated-at helpers", () => {
  it("normalizes Date to ISO", () => {
    expect(toPasswordUpdatedAtIso(new Date("2026-02-01T10:00:00.000Z"))).toBe(
      "2026-02-01T10:00:00.000Z"
    );
  });

  it("returns undefined for invalid input", () => {
    expect(toPasswordUpdatedAtIso("not-a-date")).toBeUndefined();
  });

  it("returns true when token was issued before password update", () => {
    expect(
      isTokenIssuedBeforePasswordUpdate(
        Math.floor(new Date("2026-01-01T10:00:00.000Z").getTime() / 1000),
        "2026-02-01T10:00:00.000Z"
      )
    ).toBe(true);
  });

  it("returns false when token was issued after password update", () => {
    expect(
      isTokenIssuedBeforePasswordUpdate(
        Math.floor(new Date("2026-03-01T10:00:00.000Z").getTime() / 1000),
        "2026-02-01T10:00:00.000Z"
      )
    ).toBe(false);
  });
});
