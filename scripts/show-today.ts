import { PrismaClient } from "../src/generated/prisma";

const db = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const jobs = await db.job.findMany({
    where: { firstSeenAt: { gte: today } },
    orderBy: [{ category: "asc" }, { firstSeenAt: "desc" }],
  });

  console.log(`${jobs.length} jobs first seen today:\n`);
  jobs.forEach(j =>
    console.log(`[${j.category.toUpperCase()}] ${j.label} — ${j.title}\n   ${j.url}\n`)
  );
  await db.$disconnect();
}

main();
