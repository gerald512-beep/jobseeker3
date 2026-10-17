import { PrismaClient } from '../src/generated/prisma/index.js';

const SO_INCLUDE = ['strategy and operations','strategy & operations','strategy and ops','strategy & ops','bizops','biz ops','business ops','business operations','operations manager','operations lead','operations associate','operations analyst','operations specialist','marketplace operations','product operations','revenue operations','growth operations','sales operations','customer operations','launch operations','fleet operations','logistics operations','s&o','gtm program manager','operations program manager','strategy program manager'];
const CX_INCLUDE = ['customer success manager','customer success operations','cs operations','cs ops','customer experience','cx strategy','cx operations','cx ops','support operations','service operations','customer enablement','onboarding manager','renewals manager','voice of customer','customer insights','implementation manager','customer operations','customer journey'];
const CX_EXCLUDE = ['technical program management','technical program manager','actimize'];

const US_CITIES = new Set(['New York City','New York','San Francisco','Palo Alto','Mountain View','Sunnyvale','San Jose','Los Angeles','Seattle','Chicago','Austin','Boston','Denver','Atlanta','Dallas','Houston','Miami','Portland','Washington','Redwood City','Menlo Park','Bellevue','New York, NY','San Francisco, CA']);

const slug = process.argv[2];
const label = process.argv[3];

const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
const data = await res.json();
const jobs = data.jobs ?? [];

const us = jobs.filter(j => {
  const loc = j.location?.name ?? '';
  return US_CITIES.has(loc) || /,\s*[A-Z]{2}$/.test(loc) || loc.toLowerCase().includes('remote') || loc.toLowerCase().includes('united states');
});

console.log(`=== ${label} API: ${jobs.length} total, ${us.length} US ===`);
const soM = [], cxM = [];
for (const j of us) {
  const title = j.title?.trim() ?? '';
  const dept = j.departments?.[0]?.name ?? '';
  const text = (title + ' ' + dept).toLowerCase();
  const date = j.first_published?.split('T')[0] ?? '?';
  const loc = j.location?.name ?? '';
  const url = j.absolute_url ?? '';
  if (SO_INCLUDE.some(k => text.includes(k))) soM.push(`[${date}] ${title} | ${loc}\n    ${url}`);
  if (CX_INCLUDE.some(k => text.includes(k)) && !CX_EXCLUDE.some(k => text.includes(k))) cxM.push(`[${date}] ${title} | ${loc}\n    ${url}`);
}
console.log(`\nS&O matches: ${soM.length}`);
soM.forEach(j => console.log(' ', j));
console.log(`\nCX matches: ${cxM.length}`);
cxM.forEach(j => console.log(' ', j));

const db = new PrismaClient();
const dbRows = await db.job.findMany({ where: { slug }, orderBy: [{ category: 'asc' }, { createdAt: 'desc' }], select: { title: true, location: true, createdAt: true, isActive: true, category: true } });
console.log(`\n=== DB: ${dbRows.length} total ===`);
dbRows.forEach(r => console.log(`[${r.category.toUpperCase()}] [${r.isActive ? 'active' : 'INACTIVE'}] ${r.title} | ${r.location} | ${r.createdAt ?? 'no date'}`));
await db.$disconnect();
