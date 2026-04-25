-- AlterTable
ALTER TABLE "VideotecaFolder"
ADD COLUMN "parentId" TEXT;

-- CreateIndex
CREATE INDEX "VideotecaFolder_parentId_idx" ON "VideotecaFolder"("parentId");

-- AddForeignKey
ALTER TABLE "VideotecaFolder"
ADD CONSTRAINT "VideotecaFolder_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "VideotecaFolder"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
