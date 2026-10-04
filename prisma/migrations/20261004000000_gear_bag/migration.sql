-- CreateTable
CREATE TABLE "GearPiece" (
    "id" TEXT NOT NULL,
    "gameInstanceId" TEXT NOT NULL,
    "setName" TEXT NOT NULL DEFAULT '',
    "slot" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "mainStat" TEXT NOT NULL DEFAULT '',
    "substats" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GearPiece_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GearPiece_gameInstanceId_idx" ON "GearPiece"("gameInstanceId");

-- AddForeignKey
ALTER TABLE "GearPiece" ADD CONSTRAINT "GearPiece_gameInstanceId_fkey" FOREIGN KEY ("gameInstanceId") REFERENCES "GameInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

