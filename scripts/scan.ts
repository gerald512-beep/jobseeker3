import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { runScan } from "../src/lib/scanner";

const db = new PrismaClient();

// Last 7 days of a tracker's daily record, for terminal runs (the web app shows the full history)
async function printDailyRecord(slug: string, category: string) {
  const rows = await db.dailyStat.findMany({ where: { slug, category }, orderBy: { date: "desc" }, take: 7 });
  console.log(`\n[daily] ${slug} — last ${rows.length} days with activity`);
  console.log("  date        posted  found  open");
  for (const r of rows) {
    const found = r.scannedAt ? String(r.discovered) : "-";
    const open = r.active ?? "-";
    console.log(`  ${r.date}  ${String(r.posted).padStart(6)}  ${found.padStart(5)}  ${String(open).padStart(4)}`);
  }
}

async function main() {
  console.log(`[scan] Starting at ${new Date().toISOString()}`);
  try {
    const result = await runScan(db);
    console.log(`[scan] Done. New jobs: ${result.newJobCount}, Total: ${result.totalJobs}`);
    for (const d of result.daily) await printDailyRecord(d.slug, d.category);
  } catch (err) {
    console.error("[scan] Fatal error:", err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
