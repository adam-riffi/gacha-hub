-- Task priority + nesting (parent goal → material subtasks).
ALTER TABLE "Task" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "Task" ADD COLUMN "parentId" TEXT;

CREATE INDEX "Task_parentId_idx" ON "Task"("parentId");

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
