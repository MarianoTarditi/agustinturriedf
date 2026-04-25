import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const resolveResetPasswordFile = (...segments: string[]) =>
  path.join(process.cwd(), "app", "(auth)", "reset-password", ...segments);

describe("reset-password UI structure", () => {
  it("wires request page to request form component", () => {
    const source = readFileSync(resolveResetPasswordFile("page.tsx"), "utf8");

    expect(source).toContain("ResetPasswordRequestForm");
    expect(source).toContain("<ResetPasswordRequestForm />");
  });

  it("requires token in confirm page before rendering confirm form", () => {
    const source = readFileSync(resolveResetPasswordFile("confirm", "page.tsx"), "utf8");

    expect(source).toContain("resolveConfirmTokenFromSearchParams");
    expect(source).toContain("ResetPasswordConfirmForm");
    expect(source).toContain("invalidToken.errorMessage");
  });

  it("shows login CTA after successful confirm", () => {
    const source = readFileSync(
      resolveResetPasswordFile("_components", "reset-password-confirm-form.tsx"),
      "utf8"
    );

    expect(source).toContain('href="/login"');
    expect(source).toContain("Volver al login");
  });

  it("renders visible error feedback for request and confirm forms", () => {
    const requestSource = readFileSync(
      resolveResetPasswordFile("_components", "reset-password-request-form.tsx"),
      "utf8"
    );
    const confirmSource = readFileSync(
      resolveResetPasswordFile("_components", "reset-password-confirm-form.tsx"),
      "utf8"
    );

    expect(requestSource).toContain('role="alert"');
    expect(confirmSource).toContain('role="alert"');
  });
});
