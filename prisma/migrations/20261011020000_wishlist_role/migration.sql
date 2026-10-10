-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "role" TEXT;

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "gameInstanceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_gameInstanceId_kind_catalogId_key" ON "WishlistItem"("gameInstanceId", "kind", "catalogId");

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_gameInstanceId_fkey" FOREIGN KEY ("gameInstanceId") REFERENCES "GameInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Every table: RLS on, no policies (the app connects as the owner; the Data API exposes nothing).
ALTER TABLE "WishlistItem" ENABLE ROW LEVEL SECURITY;
