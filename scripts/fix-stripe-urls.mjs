import { PrismaClient } from '../src/generated/prisma/index.js';
const db = new PrismaClient();

const jobs = await db.job.findMany({ where: { slug: 'stripe' }, select: { id: true, title: true, url: true } });
console.log('Stripe jobs:', jobs.length);

for (const job of jobs) {
  if (!job.url.includes('greenhouse.io')) {
    const ghId = job.url.match(/gh_jid=(\d+)/)?.[1];
    if (!ghId) { console.log('no gh_jid for:', job.title); continue; }
    const newUrl = `https://job-boards.greenhouse.io/stripe/jobs/${ghId}`;
    await db.job.update({ where: { id: job.id }, data: { url: newUrl } });
    console.log('fixed:', job.title, '\n ', job.url, '->', newUrl);
  }
}

await db.$disconnect();
console.log('done');
