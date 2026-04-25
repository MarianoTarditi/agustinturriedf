import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Prisma schema foundation", () => {
  const schemaPath = path.resolve(__dirname, "schema.prisma");

  const readSchema = () => readFileSync(schemaPath, "utf8");

  it("declares User and StudentProfile models with relation fields", () => {
    const schema = readSchema();

    expect(schema).toContain("datasource db");
    expect(schema).toContain('provider = "postgresql"');
    expect(schema).toContain("model User");
    expect(schema).toContain("model StudentProfile");
    expect(schema).toMatch(/studentProfile\s+StudentProfile\?\s+@relation\("StudentUserProfile"\)/);
    expect(schema).toMatch(/user\s+User\s+@relation\("StudentUserProfile"/);
  });

  it("declares self-profile fields and ProfileGender enum on User", () => {
    const schema = readSchema();

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

  it("declares password reset domain fields and relations", () => {
    const schema = readSchema();

    expect(schema).toContain("passwordUpdatedAt DateTime?");
    expect(schema).toMatch(/resetToken\s+PasswordResetToken\?/);
    expect(schema).toContain("model PasswordResetToken");
    expect(schema).toContain("userId    String   @unique");
    expect(schema).toContain("tokenHash String");
    expect(schema).toContain("expiresAt DateTime");
    expect(schema).toContain(
      'user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)',
    );
  });

  it("declares password reset lookup/index constraints", () => {
    const schema = readSchema();

    expect(schema).toContain("tokenHash String   @unique");
    expect(schema).toContain("@@index([expiresAt])");
  });

  it("contains forgot-password-flow migration with schema updates", () => {
    const migrationsDir = path.resolve(__dirname, "migrations");
    const migrationName = readdirSync(migrationsDir).find((entry) =>
      entry.endsWith("_forgot_password_flow"),
    );

    expect(migrationName).toBeDefined();

    const migrationSql = readFileSync(
      path.resolve(migrationsDir, migrationName!, "migration.sql"),
      "utf8",
    );

    expect(migrationSql).toContain('ALTER TABLE "User" ADD COLUMN "passwordUpdatedAt" TIMESTAMP(3)');
    expect(migrationSql).toContain('CREATE TABLE "PasswordResetToken"');
    expect(migrationSql).toContain('CREATE UNIQUE INDEX "PasswordResetToken_userId_key"');
    expect(migrationSql).toContain('CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key"');
    expect(migrationSql).toContain('CREATE INDEX "PasswordResetToken_expiresAt_idx"');
    expect(migrationSql).toContain(
      'ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;',
    );
  });
});
