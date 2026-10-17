import { PrismaClient } from "../src/generated/prisma/index.js";
const db = new PrismaClient();

const lastRun = await db.scanRun.findFirst({ orderBy: { ranAt: "desc" } });
const jobs = await db.job.findMany({
  where: { updatedAt: { gte: lastRun.ranAt }, firstSeenAt: { lt: lastRun.ranAt }, isActive: true },
  orderBy: [{ category: "asc" }],
  select: { label: true, title: true, location: true, category: true, url: true },
});
console.log(`Updated jobs (not new): ${jobs.length}`);
jobs.forEach(j => console.log(`[${j.category.toUpperCase()}] ${j.label} — ${j.title} | ${j.location}\n   ${j.url}`));
await db.$disconnect();
