-- CreateTable
CREATE TABLE "DailyStat" (
    "date" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "posted" INTEGER NOT NULL DEFAULT 0,
    "discovered" INTEGER NOT NULL DEFAULT 0,
    "active" INTEGER,
    "scannedAt" DATETIME,

    PRIMARY KEY ("date", "slug", "category")
);
