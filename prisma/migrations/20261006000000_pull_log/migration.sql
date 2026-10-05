-- CreateTable
CREATE TABLE "PullEntry" (
    "id" TEXT NOT NULL,
    "gameInstanceId" TEXT NOT NULL,
    "bannerKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "fiveStar" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN,
    "catalogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PullEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PullEntry_gameInstanceId_bannerKey_createdAt_idx" ON "PullEntry"("gameInstanceId", "bannerKey", "createdAt");

-- AddForeignKey
ALTER TABLE "PullEntry" ADD CONSTRAINT "PullEntry_gameInstanceId_fkey" FOREIGN KEY ("gameInstanceId") REFERENCES "GameInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Every table: RLS on, no policies (the app connects as the owner; the Data API exposes nothing).
ALTER TABLE "PullEntry" ENABLE ROW LEVEL SECURITY;
