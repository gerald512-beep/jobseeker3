-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
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
    "isNew" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'so'
);
INSERT INTO "new_Job" ("category", "city", "country", "createdAt", "department", "firstSeenAt", "id", "isNew", "label", "location", "locationConfidence", "region", "remote", "slug", "source", "title", "url") SELECT "category", "city", "country", "createdAt", "department", "firstSeenAt", "id", "isNew", "label", "location", "locationConfidence", "region", "remote", "slug", "source", "title", "url" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
