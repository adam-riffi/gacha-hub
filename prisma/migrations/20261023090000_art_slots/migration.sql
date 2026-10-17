-- CreateTable
CREATE TABLE "ArtSlot" (
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtSlot_pkey" PRIMARY KEY ("key")
);

-- Every table enables row level security (DESIGN.md §8).
ALTER TABLE "ArtSlot" ENABLE ROW LEVEL SECURITY;
