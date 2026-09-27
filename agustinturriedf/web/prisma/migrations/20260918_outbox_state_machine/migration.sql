-- Durable outbox claim fencing and secret-safe failure metadata.
ALTER TABLE "OutboxMessage"
  ADD COLUMN "fencingToken" TEXT,
  ADD COLUMN "failureCategory" TEXT,
  ADD COLUMN "failureSummary" TEXT;

CREATE INDEX "OutboxMessage_status_leaseExpiresAt_idx"
  ON "OutboxMessage"("status", "leaseExpiresAt");
