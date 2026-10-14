-- CreateTable
CREATE TABLE "TopUp" (
    "id" TEXT NOT NULL,
    "gameInstanceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "pass" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TopUp_gameInstanceId_at_idx" ON "TopUp"("gameInstanceId", "at");

-- AddForeignKey
ALTER TABLE "TopUp" ADD CONSTRAINT "TopUp_gameInstanceId_fkey" FOREIGN KEY ("gameInstanceId") REFERENCES "GameInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Every table enables row level security (DESIGN.md §8).
ALTER TABLE "TopUp" ENABLE ROW LEVEL SECURITY;
