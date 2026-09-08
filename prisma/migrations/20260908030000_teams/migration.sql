-- Saved team / party presets per profile.
CREATE TABLE "Team" (
  "id" TEXT NOT NULL,
  "gameInstanceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "members" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Team_gameInstanceId_idx" ON "Team"("gameInstanceId");

ALTER TABLE "Team"
  ADD CONSTRAINT "Team_gameInstanceId_fkey"
  FOREIGN KEY ("gameInstanceId") REFERENCES "GameInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
