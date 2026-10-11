-- CreateTable
CREATE TABLE "WeaponCopy" (
    "id" TEXT NOT NULL,
    "gameInstanceId" TEXT NOT NULL,
    "catalogId" TEXT,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "refinement" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeaponCopy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeaponCopy_gameInstanceId_idx" ON "WeaponCopy"("gameInstanceId");

-- AddForeignKey
ALTER TABLE "WeaponCopy" ADD CONSTRAINT "WeaponCopy_gameInstanceId_fkey" FOREIGN KEY ("gameInstanceId") REFERENCES "GameInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Every table enables row level security (DESIGN.md §8).
ALTER TABLE "WeaponCopy" ENABLE ROW LEVEL SECURITY;
