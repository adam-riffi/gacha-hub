-- AlterTable
ALTER TABLE "GameInstance" ADD COLUMN     "accountLevel" INTEGER,
ADD COLUMN     "uid" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "anchorKey" TEXT;

-- CreateTable
CREATE TABLE "CycleResult" (
    "id" TEXT NOT NULL,
    "gameInstanceId" TEXT NOT NULL,
    "modeKey" TEXT NOT NULL,
    "cycleStart" TIMESTAMP(3) NOT NULL,
    "result" INTEGER,
    "detail" TEXT,
    "premium" INTEGER,
    "teams" JSONB,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CycleResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassState" (
    "id" TEXT NOT NULL,
    "gameInstanceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "level" INTEGER,
    "weeklyXp" INTEGER,
    "endsAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'manual',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayRecord" (
    "id" TEXT NOT NULL,
    "gameInstanceId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "dailiesDone" INTEGER NOT NULL DEFAULT 0,
    "dailiesTotal" INTEGER NOT NULL DEFAULT 0,
    "goalsOpen" INTEGER NOT NULL DEFAULT 0,
    "pulls" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CycleResult_gameInstanceId_modeKey_cycleStart_key" ON "CycleResult"("gameInstanceId", "modeKey", "cycleStart");

-- CreateIndex
CREATE UNIQUE INDEX "PassState_gameInstanceId_kind_key" ON "PassState"("gameInstanceId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "DayRecord_gameInstanceId_day_key" ON "DayRecord"("gameInstanceId", "day");

-- AddForeignKey
ALTER TABLE "CycleResult" ADD CONSTRAINT "CycleResult_gameInstanceId_fkey" FOREIGN KEY ("gameInstanceId") REFERENCES "GameInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassState" ADD CONSTRAINT "PassState_gameInstanceId_fkey" FOREIGN KEY ("gameInstanceId") REFERENCES "GameInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayRecord" ADD CONSTRAINT "DayRecord_gameInstanceId_fkey" FOREIGN KEY ("gameInstanceId") REFERENCES "GameInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Every table: RLS on, no policies (the app connects as the owner; the Data API exposes nothing).
ALTER TABLE "CycleResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PassState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DayRecord" ENABLE ROW LEVEL SECURITY;
