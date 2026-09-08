-- Backlog (hidden completionist goals) + notify (Discord digest opt-in).
ALTER TABLE "Task" ADD COLUMN "backlog" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN "notify" BOOLEAN NOT NULL DEFAULT false;
