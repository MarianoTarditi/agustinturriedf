import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Prisma schema foundation", () => {
  it("declares User and StudentProfile models with relation fields", () => {
    const schemaPath = path.resolve(__dirname, "schema.prisma");
    const schema = readFileSync(schemaPath, "utf8");

    expect(schema).toContain("datasource db");
    expect(schema).toContain('provider = "postgresql"');
    expect(schema).toContain("model User");
    expect(schema).toContain("model StudentProfile");
    expect(schema).toContain('studentProfile StudentProfile? @relation("StudentUserProfile")');
    expect(schema).toMatch(/user\s+User\s+@relation\("StudentUserProfile"/);
  });

  it("declares self-profile fields and ProfileGender enum on User", () => {
    const schemaPath = path.resolve(__dirname, "schema.prisma");
    const schema = readFileSync(schemaPath, "utf8");

    expect(schema).toContain("enum ProfileGender");
    expect(schema).toContain("MALE");
    expect(schema).toContain("FEMALE");
    expect(schema).toContain("NON_BINARY");
    expect(schema).toContain("OTHER");

    expect(schema).toContain("phone        String?");
    expect(schema).toContain("photoUrl     String?");
    expect(schema).toContain("birthDate    DateTime?");
    expect(schema).toContain("gender       ProfileGender?");
    expect(schema).toContain("heightCm     Int?");
    expect(schema).toContain("weightKg     Int?");
  });
});
