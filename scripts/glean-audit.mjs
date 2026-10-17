import { PrismaClient } from '../src/generated/prisma/index.js';

const SO_INCLUDE = ['strategy and operations','strategy & operations','strategy and ops','strategy & ops','bizops','biz ops','business ops','business operations','operations manager','operations lead','operations associate','operations analyst','operations specialist','marketplace operations','product operations','revenue operations','growth operations','sales operations','customer operations','launch operations','fleet operations','logistics operations','s&o','s & o','gtm program manager','operations program manager','strategy program manager'];
const CX_INCLUDE = ['customer success manager','customer success operations','cs operations','cs ops','customer experience','cx strategy','cx operations','cx ops','support operations','service operations','customer enablement','onboarding manager','renewals manager','voice of customer','customer insights','implementation manager','customer operations','customer journey'];

const res = await fetch('https://boards-api.greenhouse.io/v1/boards/gleanwork/jobs?content=true', { headers: { 'User-Agent': 'Mozilla/5.0' } });
const data = await res.json();
const jobs = data.jobs ?? [];

const us = jobs.filter(j => {
  const loc = j.location?.name ?? '';
  return loc.toLowerCase().includes('united states') || /,\s*[A-Z]{2}$/.test(loc);
});
console.log(`Total: ${jobs.length} | US (strict): ${us.length}`);

const soMatches = [], cxMatches = [];
for (const j of us) {
  const title = j.title?.trim() ?? '';
  const dept = j.departments?.[0]?.name ?? '';
  const text = `${title} ${dept}`.toLowerCase();
  const date = j.first_published?.split('T')[0] ?? '?';
  const loc = j.location?.name ?? '';
  const url = j.absolute_url ?? '';
  const soKw = SO_INCLUDE.find(k => text.includes(k));
  const cxKw = CX_INCLUDE.find(k => text.includes(k));
  if (soKw) soMatches.push({ title, dept, loc, date, url, kw: soKw });
  if (cxKw) cxMatches.push({ title, dept, loc, date, url, kw: cxKw });
}

console.log(`\nS&O matches: ${soMatches.length}`);
soMatches.forEach(j => console.log(`  [${j.date}] ${j.title} | ${j.loc} | dept:${j.dept} | kw:"${j.kw}"\n    ${j.url}`));
console.log(`\nCX matches: ${cxMatches.length}`);
cxMatches.forEach(j => console.log(`  [${j.date}] ${j.title} | ${j.loc} | dept:${j.dept} | kw:"${j.kw}"\n    ${j.url}`));

// DB comparison
const db = new PrismaClient();
const dbRows = await db.job.findMany({ where: { slug: 'gleanwork' }, orderBy: [{ category: 'asc' }, { createdAt: 'desc' }], select: { title: true, location: true, createdAt: true, isActive: true, category: true } });
console.log(`\n=== DB (${dbRows.length} total) ===`);
dbRows.forEach(r => console.log(`[${r.category.toUpperCase()}] [${r.isActive ? 'active' : 'INACTIVE'}] ${r.title} | ${r.location} | ${r.createdAt ?? 'no date'}`));
await db.$disconnect();
