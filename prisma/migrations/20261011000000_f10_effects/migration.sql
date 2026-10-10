-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "choice" INTEGER,
ADD COLUMN     "eventId" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "effects" JSONB;

-- CreateTable
CREATE TABLE "EffectApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "gameInstanceId" TEXT NOT NULL,
    "undo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EffectApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EffectApplication_userId_eventId_key_key" ON "EffectApplication"("userId", "eventId", "key");

-- AddForeignKey
ALTER TABLE "EffectApplication" ADD CONSTRAINT "EffectApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EffectApplication" ADD CONSTRAINT "EffectApplication_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Every table: RLS on, no policies (the app connects as the owner; the Data API exposes nothing).
ALTER TABLE "EffectApplication" ENABLE ROW LEVEL SECURITY;
