import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../..");
const schemaPath = path.join(webRoot, "prisma/schema.prisma");
const migrationPath = path.join(webRoot, "prisma/migrations/20260913_admin_users_foundation/migration.sql");
const reconciliationPath = path.join(
  webRoot,
  "prisma/reconciliation/admin-users-foundation.sql"
);
const packagePath = path.join(webRoot, "package.json");

describe("admin-user schema foundation", () => {
  it("adds lifecycle versions and archival state for compare-and-set transitions", () => {
    const schema = readFileSync(schemaPath, "utf8");
    const migration = readFileSync(migrationPath, "utf8");

    expect(schema).toContain("enum AccountStatus");
    expect(schema).toContain("ARCHIVED");
    expect(schema).toMatch(/status\s+AccountStatus\s+@default\(ACTIVE\)/);
    expect(schema).toMatch(/version\s+Int\s+@default\(1\)/);
    expect(schema).toMatch(/authVersion\s+Int\s+@default\(1\)/);
    expect(schema).toContain("archivedAt");
    expect(migration).toContain('CREATE INDEX "User_active_admin_idx"');
  });

  it("preserves a serializable last-active-admin foundation without guessing contradictory profiles", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
    expect(migration).toContain("Contradictory User role and StudentProfile state");
    expect(migration).toContain('WHERE "role" = \'ADMIN\' AND "status" = \'ACTIVE\'');
  });

  it("provides a read-only reconciliation command for the deployed schema foundation", () => {
    const reconciliation = readFileSync(reconciliationPath, "utf8");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["prisma:reconcile:admin-users"]).toBe(
      "prisma db execute --file prisma/reconciliation/admin-users-foundation.sql --schema prisma/schema.prisma"
    );
    expect(reconciliation).toMatch(/^DO \$\$/m);
    expect(reconciliation).toContain("RAISE EXCEPTION");
    expect(reconciliation).toContain('u."status"::text <> sp."status"::text');
    expect(reconciliation).toContain('u."role" = \'ADMIN\'');
    expect(reconciliation).toContain('u."status" = \'ACTIVE\'');
    expect(reconciliation).toContain('to_regclass(\'public."User_active_admin_idx"\')');
    expect(reconciliation).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE)\b/);
  });
});
