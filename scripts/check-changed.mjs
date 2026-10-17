import { PrismaClient } from "../src/generated/prisma/index.js";
const db = new PrismaClient();

const lastTwoRuns = await db.scanRun.findMany({ orderBy: { ranAt: "desc" }, take: 2 });
const cutoff = lastTwoRuns.length >= 2 ? lastTwoRuns[1].ranAt : new Date(0);

const jobs = await db.job.findMany({
  where: { firstSeenAt: { gt: cutoff }, isActive: true },
  orderBy: [{ category: "asc" }, { firstSeenAt: "desc" }],
  select: { id: true, label: true, title: true, location: true, createdAt: true, category: true },
});
console.log("Changed/new since last scan:", jobs.length);
jobs.forEach(j => console.log(`[${j.category.toUpperCase()}] ${j.label} — ${j.title} | ${j.location} | ${j.createdAt}`));
await db.$disconnect();
