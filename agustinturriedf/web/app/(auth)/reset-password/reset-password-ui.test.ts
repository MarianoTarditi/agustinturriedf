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

  it("renders toast-compatible forms with showToast hook", () => {
    const requestSource = readFileSync(
      resolveResetPasswordFile("_components", "reset-password-request-form.tsx"),
      "utf8"
    );
    const confirmSource = readFileSync(
      resolveResetPasswordFile("_components", "reset-password-confirm-form.tsx"),
      "utf8"
    );

    // Both forms use showToast from useToast hook for error feedback
    expect(requestSource).toContain("showToast");
    expect(confirmSource).toContain("showToast");
    // Fallback error messages are provided for null safety
    expect(requestSource).toContain("Ocurrió un error");
    expect(confirmSource).toContain("Ocurrió un error");
  });
});
