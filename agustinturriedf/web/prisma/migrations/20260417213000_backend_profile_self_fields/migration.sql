-- CreateEnum
CREATE TYPE "ProfileGender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'OTHER');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "birthDate" TIMESTAMP(3),
ADD COLUMN "gender" "ProfileGender",
ADD COLUMN "heightCm" INTEGER,
ADD COLUMN "phone" TEXT,
ADD COLUMN "photoUrl" TEXT,
ADD COLUMN "weightKg" INTEGER;
