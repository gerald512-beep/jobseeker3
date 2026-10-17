import { PrismaClient } from "../src/generated/prisma/index.js";
const db = new PrismaClient();
const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
const jobs = await db.job.findMany({
  where: { firstSeenAt: { gte: cutoff }, isActive: true },
  orderBy: { firstSeenAt: "desc" },
});
if (jobs.length === 0) { console.log("No new jobs in last 24 hours"); }
for (const j of jobs) {
  console.log(`[${j.category.toUpperCase()}] ${j.title} | ${j.label} | ${j.location ?? "-"} | ${j.createdAt ?? "n/a"}`);
  console.log(`  ${j.url}`);
}
await db.$disconnect();
