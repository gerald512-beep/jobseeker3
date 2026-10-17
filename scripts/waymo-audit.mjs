import { PrismaClient } from '../src/generated/prisma/index.js';

const db = new PrismaClient();

// What's in DB
const rows = await db.job.findMany({
  where: { slug: 'waymo' },
  orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
  select: { title: true, location: true, createdAt: true, category: true, isActive: true }
});
console.log('=== Waymo in DB (' + rows.length + ' total) ===');
rows.forEach(r => console.log('[' + r.category.toUpperCase() + '] [' + (r.isActive ? 'active' : 'INACTIVE') + '] ' + r.title + ' | ' + r.location + ' | ' + (r.createdAt ?? 'no date')));

await db.$disconnect();

// What's in sitemap (slug candidates)
const SO_INCLUDE = ['strategy and operations','strategy & operations','strategy and ops','strategy & ops','bizops','biz ops','business ops','business operations','operations manager','operations lead','operations associate','operations analyst','operations specialist','marketplace operations','product operations','revenue operations','growth operations','sales operations','customer operations','launch operations','fleet operations','logistics operations','s&o','gtm program manager','operations program manager','strategy program manager'];
const CX_INCLUDE = ['customer success manager','customer success operations','cs operations','cs ops','customer experience','cx strategy','cx operations','cx ops','support operations','service operations','customer enablement','onboarding manager','renewals manager','voice of customer','customer insights','implementation manager','customer operations','customer journey'];
const SLUG_KW = ['operations','strategy','bizops','biz-ops','business-ops','logistics','marketplace','revenue-ops','growth-ops','launch-ops'];

const res = await fetch('https://careers.withwaymo.com/sitemap.xml', { headers: { 'User-Agent': 'Mozilla/5.0' } });
const xml = await res.text();
const re = /<loc>(https:\/\/careers\.withwaymo\.com\/jobs\/([^<]+))<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g;
let m;
const candidates = [];
while ((m = re.exec(xml)) !== null) {
  if (SLUG_KW.some(k => m[2].includes(k))) candidates.push({ url: m[1], slug: m[2], lastmod: m[3] });
}

console.log('\n=== Sitemap candidates (' + candidates.length + ') ===');
candidates.forEach(c => {
  // Guess title from slug
  const title = c.slug.replace(/-[a-z]+-[a-z]+-united-states.*/, '').replace(/-[a-z]+-[a-z]+-[a-z]+-united-states.*/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const soMatch = SO_INCLUDE.some(k => title.toLowerCase().includes(k));
  const cxMatch = CX_INCLUDE.some(k => title.toLowerCase().includes(k));
  const tag = soMatch && cxMatch ? '[S&O+CX]' : soMatch ? '[S&O]' : cxMatch ? '[CX]' : '[NO MATCH]';
  console.log(tag + ' [' + c.lastmod + '] ' + c.slug.substring(0, 80));
});
