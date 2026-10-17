import { PrismaClient } from '../src/generated/prisma/index.js';
const db = new PrismaClient();
const rows = await db.job.findMany({
  where: { slug: 'doordashusa', isActive: true },
  orderBy: { createdAt: 'desc' },
  take: 10,
  select: { title: true, location: true, createdAt: true, category: true, url: true }
});
rows.forEach(r => console.log(`[${r.category.toUpperCase()}] ${r.title}\n  ${r.location} | ${r.createdAt ?? 'no date'}\n  ${r.url}`));
await db.$disconnect();
