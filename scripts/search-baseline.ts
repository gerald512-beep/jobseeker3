import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { TITLE_PHRASES, fetchAdzunaPage, normalizeAndFilter, jobToDbRow } from "../src/lib/adzuna";

const db = new PrismaClient();

async function main() {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.error("ADZUNA_APP_ID and ADZUNA_APP_KEY must be set in .env");
    process.exit(1);
  }

  console.log("[baseline] Seeding 90-day Adzuna search results...\n");

  const seen = new Set<string>();
  let totalStored = 0;
  let totalSkipped = 0;

  for (const phrase of TITLE_PHRASES) {
    console.log(`Phrase: "${phrase}"`);
    const allRaw = [];

    for (let page = 1; page <= 10; page++) {
      const results = await fetchAdzunaPage(appId, appKey, phrase, page, { maxDaysOld: 90 });
      if (results.length === 0) break;
      allRaw.push(...results);
      process.stdout.write(`  page ${page}: ${results.length} raw`);
      if (results.length < 50) { process.stdout.write(" (last)\n"); break; }
      process.stdout.write("\n");
      await new Promise((r) => setTimeout(r, 300));
    }

    const normalized = normalizeAndFilter(allRaw, seen);
    console.log(`  ${normalized.length} passed title filter`);
    if (normalized.length === 0) continue;

    const existing = await db.job.findMany({
      where: { id: { in: normalized.map((j) => j.id) } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((j) => j.id));
    const newOnes = normalized.filter((j) => !existingIds.has(j.id));

    totalSkipped += existingIds.size;

    if (newOnes.length > 0) {
      await db.job.createMany({
        data: newOnes.map((j) => jobToDbRow(j, { isNew: false })),
      });
      totalStored += newOnes.length;
      console.log(`  stored ${newOnes.length} (${existingIds.size} already in DB)\n`);
    } else {
      console.log(`  all ${existingIds.size} already in DB\n`);
    }
  }

  console.log(`[baseline] Done — stored: ${totalStored}, skipped (already existed): ${totalSkipped}`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => db.$disconnect());
