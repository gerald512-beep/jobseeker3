import { PrismaClient } from '../src/generated/prisma/index.js';
const db = new PrismaClient();
const rows = await db.job.findMany({
  where: { slug: 'braze' },
  orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
  select: { title: true, location: true, createdAt: true, isActive: true, category: true }
});
console.log('Braze in DB:', rows.length);
rows.forEach(r => console.log('[' + r.category.toUpperCase() + '] [' + (r.isActive ? 'active' : 'INACTIVE') + '] ' + r.title + ' | ' + r.location + ' | ' + (r.createdAt ?? 'no date')));
await db.$disconnect();
