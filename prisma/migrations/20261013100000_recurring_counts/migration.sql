-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "progressAt" TIMESTAMP(3);

-- The games' counted defaults on profiles made before them (Georges's designs, 2026-10-11).
UPDATE "Task" SET "target" = 4 FROM "GameInstance" g WHERE "Task"."refId" = g."id" AND g."gameKey" = 'genshin' AND "Task"."type" = 'recurring' AND "Task"."title" = 'Daily Commissions' AND "Task"."target" IS NULL;
UPDATE "Task" SET "target" = 3 FROM "GameInstance" g WHERE "Task"."refId" = g."id" AND g."gameKey" = 'genshin' AND "Task"."type" = 'recurring' AND "Task"."title" = 'Weekly Bosses' AND "Task"."target" IS NULL;
UPDATE "Task" SET "target" = 5 FROM "GameInstance" g WHERE "Task"."refId" = g."id" AND g."gameKey" = 'hsr' AND "Task"."type" = 'recurring' AND "Task"."title" = 'Daily Training' AND "Task"."target" IS NULL;
UPDATE "Task" SET "target" = 4 FROM "GameInstance" g WHERE "Task"."refId" = g."id" AND g."gameKey" = 'zzz' AND "Task"."type" = 'recurring' AND "Task"."title" = 'Daily Missions' AND "Task"."target" IS NULL;
UPDATE "Task" SET "target" = 5 FROM "GameInstance" g WHERE "Task"."refId" = g."id" AND g."gameKey" = 'wuwa' AND "Task"."type" = 'recurring' AND "Task"."title" = 'Daily Activity' AND "Task"."target" IS NULL;
UPDATE "Task" SET "target" = 3 FROM "GameInstance" g WHERE "Task"."refId" = g."id" AND g."gameKey" = 'wuwa' AND "Task"."type" = 'recurring' AND "Task"."title" = 'Weekly Bosses' AND "Task"."target" IS NULL;
UPDATE "Task" SET "target" = 4 FROM "GameInstance" g WHERE "Task"."refId" = g."id" AND g."gameKey" = 'nte' AND "Task"."type" = 'recurring' AND "Task"."title" = 'Daily quests' AND "Task"."target" IS NULL;
UPDATE "Task" SET "target" = 3 FROM "GameInstance" g WHERE "Task"."refId" = g."id" AND g."gameKey" = 'nte' AND "Task"."type" = 'recurring' AND "Task"."title" = 'Anomaly Pilgrimage' AND "Task"."target" IS NULL;
