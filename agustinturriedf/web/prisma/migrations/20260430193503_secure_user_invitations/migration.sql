-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'SENT', 'CONSUMED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "VideotecaFile" ADD COLUMN     "thumbnailPath" TEXT;

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trainerId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" "ProfileGender",
    "heightCm" INTEGER,
    "weightKg" INTEGER,
    "initialPaymentStartDate" TIMESTAMP(3),
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_email_key" ON "Invitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "Invitation_trainerId_idx" ON "Invitation"("trainerId");

-- CreateIndex
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");

-- CreateIndex
CREATE INDEX "Invitation_status_idx" ON "Invitation"("status");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
