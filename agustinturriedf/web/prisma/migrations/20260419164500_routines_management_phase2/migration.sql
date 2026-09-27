-- CreateTable
CREATE TABLE "RoutineFolder" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineFile" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "observations" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoutineFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoutineFolder_studentProfileId_key" ON "RoutineFolder"("studentProfileId");

-- CreateIndex
CREATE INDEX "RoutineFolder_studentProfileId_idx" ON "RoutineFolder"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineFile_folderId_normalizedName_key" ON "RoutineFile"("folderId", "normalizedName");

-- CreateIndex
CREATE INDEX "RoutineFile_folderId_idx" ON "RoutineFile"("folderId");

-- CreateIndex
CREATE INDEX "RoutineFile_uploadedAt_idx" ON "RoutineFile"("uploadedAt");

-- AddForeignKey
ALTER TABLE "RoutineFolder" ADD CONSTRAINT "RoutineFolder_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineFile" ADD CONSTRAINT "RoutineFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "RoutineFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
