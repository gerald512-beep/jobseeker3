import { PrismaClient } from "../src/generated/prisma";

const db = new PrismaClient();

async function main() {
  const runs = await db.scanRun.findMany({ orderBy: { ranAt: "desc" }, take: 5 });
  console.log("Recent scan runs:");
  runs.forEach(r => console.log(` ${r.ranAt.toISOString()}  new=${r.newJobs}`));

  // Use 3rd run as cutoff to see what the first scan this session added
  const cutoff = runs.length >= 3 ? runs[2].ranAt : new Date(0);
  console.log(`\nJobs first seen after ${cutoff.toISOString()}:\n`);

  const jobs = await db.job.findMany({
    where: { firstSeenAt: { gt: cutoff } },
    orderBy: [{ category: "asc" }, { firstSeenAt: "desc" }],
  });

  jobs.forEach(j =>
    console.log(`[${j.category.toUpperCase()}] ${j.label} — ${j.title}\n   ${j.url}\n`)
  );
  await db.$disconnect();
}

main();
