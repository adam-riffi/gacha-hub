-- AlterTable
ALTER TABLE "PullEntry" ADD COLUMN     "recordId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual';

-- CreateIndex
CREATE UNIQUE INDEX "PullEntry_gameInstanceId_recordId_key" ON "PullEntry"("gameInstanceId", "recordId");

