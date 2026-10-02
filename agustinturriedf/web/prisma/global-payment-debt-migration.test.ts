import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(join(process.cwd(), "prisma/migrations/20260930_global_payment_debt/migration.sql"), "utf8");

describe("global payment debt migration", () => {
  it("is additive and rerunnable without deriving historical debt", () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "PaymentConfig"');
    expect(sql).toContain("ON CONFLICT (\"id\") DO NOTHING");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS \"outstandingAmountInCents\"");
    expect(sql).toContain('WHERE payment."outstandingAmountInCents" IS NULL');
    expect(sql).toContain('SET "outstandingAmountInCents" = 0');
    expect(sql).not.toMatch(/DELETE FROM\s+"(?:CurrentPayment|PaymentHistory)"/i);
  });

  it("repairs only pending/sent invitation dates and advances stale boundaries", () => {
    expect(sql).toContain('WHERE "status" IN (\'PENDING\', \'SENT\')');
    expect(sql).toContain('payment."dueDate" > rollout.today_ba');
    expect(sql).toContain("INTERVAL '30 days'");
  });
});
