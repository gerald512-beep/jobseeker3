-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "locationConfidence" TEXT NOT NULL DEFAULT 'none',
    "url" TEXT NOT NULL,
    "department" TEXT,
    "createdAt" TEXT,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isNew" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "ScanRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ranAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "newJobCount" INTEGER NOT NULL DEFAULT 0,
    "totalJobs" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT
);
