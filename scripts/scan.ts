import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { runScan } from "../src/lib/scanner";

const db = new PrismaClient();

async function main() {
  console.log(`[scan] Starting at ${new Date().toISOString()}`);
  try {
    const result = await runScan(db);
    console.log(`[scan] Done. New jobs: ${result.newJobCount}, Total: ${result.totalJobs}`);
  } catch (err) {
    console.error("[scan] Fatal error:", err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
