import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const resolveActivationFile = (...segments: string[]) =>
  path.join(process.cwd(), "app", "(auth)", "activation", ...segments);

describe("activation UI structure", () => {
  it("reads token from search params and renders ActivationForm", () => {
    const source = readFileSync(resolveActivationFile("page.tsx"), "utf8");

    expect(source).toContain("resolveActivationToken");
    expect(source).toContain("searchParams");
    expect(source).toContain("ActivationForm");
  });

  it("shows invalid link message when token is missing", () => {
    const source = readFileSync(resolveActivationFile("page.tsx"), "utf8");

    expect(source).toContain("El enlace de activación no es válido");
  });

  it("posts activation payload and redirects to confirmation screen", () => {
    const source = readFileSync(resolveActivationFile("_components", "activation-form.tsx"), "utf8");

    expect(source).toContain('fetch("/api/activations"');
    expect(source).toContain('router.push("/activation/confirm")');
    expect(source).toContain("confirmPassword");
  });

  it("shows login CTA in confirmation page", () => {
    const source = readFileSync(resolveActivationFile("confirm", "page.tsx"), "utf8");

    expect(source).toContain('href="/login"');
    expect(source).toContain("Cuenta activada");
  });
});
