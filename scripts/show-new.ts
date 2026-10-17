import { PrismaClient } from "../src/generated/prisma";

const db = new PrismaClient();

async function main() {
  // Get the second-most-recent scan time as the cutoff
  const runs = await db.scanRun.findMany({ orderBy: { ranAt: "desc" }, take: 2 });
  const cutoff = runs.length >= 2 ? runs[1].ranAt : new Date(0);

  const jobs = await db.job.findMany({
    where: { firstSeenAt: { gt: cutoff } },
    orderBy: [{ category: "asc" }, { firstSeenAt: "desc" }],
  });

  console.log(`${jobs.length} new jobs since last scan (${cutoff.toISOString()}):\n`);
  jobs.forEach(j =>
    console.log(`[${j.category.toUpperCase()}] ${j.label} — ${j.title}\n   Loc: ${j.location} | Posted: ${j.createdAt ?? "n/a"}\n   ${j.url}\n`)
  );
  await db.$disconnect();
}

main();
