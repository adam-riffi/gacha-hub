-- Per-build completion status for analytics (unbuilt characters).
ALTER TABLE "Character" ADD COLUMN "buildStatus" TEXT NOT NULL DEFAULT 'none';
