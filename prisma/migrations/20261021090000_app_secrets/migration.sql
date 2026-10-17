-- CreateTable
CREATE TABLE "AppSecret" (
    "name" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSecret_pkey" PRIMARY KEY ("name")
);

-- Every table enables row level security (DESIGN.md §8).
ALTER TABLE "AppSecret" ENABLE ROW LEVEL SECURITY;
