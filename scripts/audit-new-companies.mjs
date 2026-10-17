import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/index.js";

const db = new PrismaClient();
const slugs = ["cresta","dialpad","talkdesk2","intercom","solidroad","avoca","decagon","gigaml","Maven-agi","bland","glia","Sierra","sprinklr"];

const jobs = await db.job.findMany({
  where: { slug: { in: slugs }, isActive: true },
  select: { slug: true, title: true, location: true, category: true },
  orderBy: [{ slug: "asc" }, { category: "asc" }],
});

const bySlug = {};
jobs.forEach(j => { if (!bySlug[j.slug]) bySlug[j.slug] = []; bySlug[j.slug].push(j); });

for (const s of slugs) {
  const list = bySlug[s] || [];
  console.log(`\n=== ${s} (${list.length}) ===`);
  list.forEach(j => console.log(`  [${j.category}] ${j.title} | ${j.location}`));
}

await db.$disconnect();
