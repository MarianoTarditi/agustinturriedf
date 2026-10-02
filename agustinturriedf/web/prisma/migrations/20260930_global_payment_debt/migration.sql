-- Add the application-wide singleton without changing retained trainer configuration.
CREATE TABLE IF NOT EXISTS "PaymentConfig" (
    "id" TEXT NOT NULL,
    "defaultMonthlyAmountInCents" INTEGER NOT NULL DEFAULT 3000000,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentConfig_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PaymentConfig_singleton_check" CHECK ("id" = 'GLOBAL'),
    CONSTRAINT "PaymentConfig_amount_positive_check" CHECK ("defaultMonthlyAmountInCents" > 0),
    CONSTRAINT "PaymentConfig_version_positive_check" CHECK ("version" > 0)
);

INSERT INTO "PaymentConfig" ("id", "defaultMonthlyAmountInCents", "version", "updatedAt")
VALUES ('GLOBAL', 3000000, 1, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "CurrentPayment"
  ADD COLUMN IF NOT EXISTS "outstandingAmountInCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "overdueSinceDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "version" INTEGER;

-- Only rows not already backfilled are changed. Advance stale boundaries without debt.
WITH rollout AS (
  SELECT ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date + time '03:00') AS today_ba
)
UPDATE "CurrentPayment" AS payment
SET "outstandingAmountInCents" = 0,
    "overdueSinceDate" = NULL,
    "version" = 1,
    "dueDate" = CASE
      WHEN payment."dueDate" > rollout.today_ba THEN payment."dueDate"
      ELSE payment."dueDate" + (
        (FLOOR(EXTRACT(EPOCH FROM (rollout.today_ba - payment."dueDate")) / 86400 / 30) + 1) * INTERVAL '30 days'
      )
    END
FROM rollout
WHERE payment."outstandingAmountInCents" IS NULL;

-- Repair only unconsumed invitation business dates, preserving their stored UTC key.
UPDATE "Invitation"
SET "initialPaymentStartDate" = date_trunc('day', "initialPaymentStartDate") + INTERVAL '3 hours'
WHERE "status" IN ('PENDING', 'SENT')
  AND "initialPaymentStartDate" IS NOT NULL
  AND "initialPaymentStartDate" = date_trunc('day', "initialPaymentStartDate");

ALTER TABLE "CurrentPayment"
  ALTER COLUMN "outstandingAmountInCents" SET DEFAULT 0,
  ALTER COLUMN "outstandingAmountInCents" SET NOT NULL,
  ALTER COLUMN "version" SET DEFAULT 1,
  ALTER COLUMN "version" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "CurrentPayment" ADD CONSTRAINT "CurrentPayment_amount_positive_check" CHECK ("amountInCents" > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CurrentPayment" ADD CONSTRAINT "CurrentPayment_outstanding_nonnegative_check" CHECK ("outstandingAmountInCents" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CurrentPayment" ADD CONSTRAINT "CurrentPayment_version_positive_check" CHECK ("version" > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
