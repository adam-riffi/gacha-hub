-- DropIndex
DROP INDEX "ReminderLog_ruleId_firedFor_key";

-- AlterTable
ALTER TABLE "ReminderLog" ADD COLUMN     "key" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "ReminderLog_ruleId_firedFor_key_key" ON "ReminderLog"("ruleId", "firedFor", "key");

