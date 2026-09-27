-- CreateTable
CREATE TABLE "VideotecaFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideotecaFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideotecaFile" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideotecaFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideotecaFolder_updatedAt_idx" ON "VideotecaFolder"("updatedAt");

-- CreateIndex
CREATE INDEX "VideotecaFile_folderId_idx" ON "VideotecaFile"("folderId");

-- CreateIndex
CREATE INDEX "VideotecaFile_orderIndex_idx" ON "VideotecaFile"("orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "VideotecaFile_folderId_normalizedName_key" ON "VideotecaFile"("folderId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "VideotecaFile_folderId_orderIndex_key" ON "VideotecaFile"("folderId", "orderIndex");

-- AddForeignKey
ALTER TABLE "VideotecaFile" ADD CONSTRAINT "VideotecaFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "VideotecaFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
