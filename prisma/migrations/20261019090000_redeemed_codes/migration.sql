-- CreateTable
CREATE TABLE "RedeemedCode" (
    "id" TEXT NOT NULL,
    "gameInstanceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedeemedCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RedeemedCode_gameInstanceId_code_key" ON "RedeemedCode"("gameInstanceId", "code");

-- AddForeignKey
ALTER TABLE "RedeemedCode" ADD CONSTRAINT "RedeemedCode_gameInstanceId_fkey" FOREIGN KEY ("gameInstanceId") REFERENCES "GameInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Every table enables row level security (DESIGN.md §8).
ALTER TABLE "RedeemedCode" ENABLE ROW LEVEL SECURITY;
