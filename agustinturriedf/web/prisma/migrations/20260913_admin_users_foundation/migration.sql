-- Admin Users schema foundation. Services must execute lifecycle guards with
-- SET TRANSACTION ISOLATION LEVEL SERIALIZABLE and retry Prisma P2034 conflicts.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "User" u
    LEFT JOIN "StudentProfile" p ON p."userId" = u.id
    WHERE (u.role = 'STUDENT' AND p.id IS NULL) OR (u.role <> 'STUDENT' AND p.id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Contradictory User role and StudentProfile state';
  END IF;
END $$;

CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED', 'ARCHIVED');
CREATE TYPE "InvitationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TYPE "ProvisioningStatus" AS ENUM ('PENDING', 'READY', 'FAILED');
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'SYSTEM', 'SUBJECT');

ALTER TABLE "User" ADD COLUMN "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "archivedAt" TIMESTAMP(3), ADD COLUMN "archivedByUserId" TEXT,
  ADD COLUMN "archiveReason" TEXT;
UPDATE "User" u SET "status" = p.status::text::"AccountStatus"
FROM "StudentProfile" p WHERE p."userId" = u.id;
ALTER TABLE "User" ADD CONSTRAINT "User_archive_context_check"
  CHECK ("status" <> 'ARCHIVED' OR ("archivedAt" IS NOT NULL AND "archiveReason" IS NOT NULL));
ALTER TABLE "User" ADD CONSTRAINT "User_archivedByUserId_fkey"
  FOREIGN KEY ("archivedByUserId") REFERENCES "User"(id) ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "User_active_admin_idx" ON "User"("id") WHERE "role" = 'ADMIN' AND "status" = 'ACTIVE';

DROP INDEX "Invitation_email_key";
ALTER TABLE "Invitation" ALTER COLUMN "trainerId" DROP NOT NULL,
  ADD COLUMN "role" "Role" NOT NULL DEFAULT 'STUDENT',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "deliveryStatus" "InvitationDeliveryStatus" NOT NULL DEFAULT 'PENDING';
UPDATE "Invitation" SET "deliveryStatus" = 'SENT', "status" = 'PENDING' WHERE "status" = 'SENT';
CREATE UNIQUE INDEX "Invitation_pending_email_key" ON "Invitation"("email") WHERE "status" = 'PENDING';
CREATE INDEX "Invitation_role_idx" ON "Invitation"("role");
ALTER TABLE "StudentProfile" ADD COLUMN "provisioningStatus" "ProvisioningStatus" NOT NULL DEFAULT 'PENDING';

CREATE TABLE "ActivationSession" (
  "id" TEXT NOT NULL, "invitationId" TEXT NOT NULL, "sessionHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivationSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ActivationSession_sessionHash_key" ON "ActivationSession"("sessionHash");
CREATE INDEX "ActivationSession_invitationId_idx" ON "ActivationSession"("invitationId");
CREATE INDEX "ActivationSession_expiresAt_idx" ON "ActivationSession"("expiresAt");
ALTER TABLE "ActivationSession" ADD CONSTRAINT "ActivationSession_invitationId_fkey"
  FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL, "eventType" TEXT NOT NULL, "subjectUserId" TEXT, "invitationId" TEXT,
  "actorType" "AuditActorType" NOT NULL, "actorUserId" TEXT, "reason" TEXT, "summary" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditEvent_subjectUserId_createdAt_idx" ON "AuditEvent"("subjectUserId", "createdAt");
CREATE INDEX "AuditEvent_invitationId_createdAt_idx" ON "AuditEvent"("invitationId", "createdAt");
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AuditEvent_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "OutboxMessage" (
  "id" TEXT NOT NULL, "messageType" TEXT NOT NULL, "resourceType" TEXT NOT NULL, "resourceId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL, "payloadEncrypted" TEXT, "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0, "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseExpiresAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "OutboxMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OutboxMessage_idempotencyKey_key" ON "OutboxMessage"("idempotencyKey");
CREATE INDEX "OutboxMessage_status_availableAt_idx" ON "OutboxMessage"("status", "availableAt");

CREATE TABLE "ThrottleBucket" (
  "id" TEXT NOT NULL, "scope" TEXT NOT NULL, "subject" TEXT NOT NULL, "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ThrottleBucket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ThrottleBucket_scope_subject_key" ON "ThrottleBucket"("scope", "subject");
CREATE INDEX "ThrottleBucket_resetAt_idx" ON "ThrottleBucket"("resetAt");
