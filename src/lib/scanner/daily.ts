import { format } from "date-fns";
import type { PrismaClient } from "@/generated/prisma";
import type { Company } from "@/types";

/** Local calendar date as YYYY-MM-DD. (toISOString() would give the UTC date, which is tomorrow on US evenings.) */
export function localDate(d: Date = new Date()): string {
  return format(d, "yyyy-MM-dd");
}

export const companyKey = (c: { source: string; slug: string; category: string }) =>
  `${c.source}|${c.slug}|${c.category}`;

export interface DailySummary {
  slug: string;
  category: string;
  date: string;
  postedToday: number;
  discovered: number;
  active: number;
}

/**
 * Update DailyStat for each tracked company after a scan.
 * - `posted` is recomputed for every date from all known jobs (open or since closed), so days a scan
 *   didn't run on are backfilled once a later scan sees their postings.
 * - `discovered`, `active` and `scannedAt` are written for today only.
 * Companies whose fetch failed are skipped, so a network error never shows up as jobs closing.
 */
export async function recordDailyStats(
  db: PrismaClient,
  tracked: Company[],
  discoveredByKey: Map<string, number>,
  failedKeys: Set<string>,
): Promise<DailySummary[]> {
  const today = localDate();
  const now = new Date();
  const summaries: DailySummary[] = [];

  for (const c of tracked) {
    const key = companyKey(c);
    if (failedKeys.has(key)) {
      console.log(`[daily] ${c.slug}/${c.category}: fetch failed, daily record not updated`);
      continue;
    }

    const rows = await db.job.findMany({
      where: { source: c.source, slug: c.slug, category: c.category },
      select: { createdAt: true, isActive: true },
    });
    const postedByDate = new Map<string, number>();
    for (const r of rows) {
      const date = r.createdAt?.slice(0, 10);
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) postedByDate.set(date, (postedByDate.get(date) ?? 0) + 1);
    }
    const active = rows.filter((r) => r.isActive).length;
    const discovered = discoveredByKey.get(key) ?? 0;
    const id = (date: string) => ({ date_slug_category: { date, slug: c.slug, category: c.category } });

    await db.$transaction([
      // A date left with no known postings (e.g. a job's posted date changed) goes back to 0
      db.dailyStat.updateMany({
        where: { slug: c.slug, category: c.category, date: { notIn: [...postedByDate.keys()] }, posted: { not: 0 } },
        data: { posted: 0 },
      }),
      ...[...postedByDate].map(([date, posted]) =>
        db.dailyStat.upsert({
          where: id(date),
          create: { date, slug: c.slug, category: c.category, posted },
          update: { posted },
        }),
      ),
      db.dailyStat.upsert({
        where: id(today),
        create: { date: today, slug: c.slug, category: c.category, posted: 0, discovered, active, scannedAt: now },
        update: { discovered: { increment: discovered }, active, scannedAt: now },
      }),
    ]);

    const summary = { slug: c.slug, category: c.category, date: today, postedToday: postedByDate.get(today) ?? 0, discovered, active };
    summaries.push(summary);
    console.log(
      `[daily] ${c.label}: ${summary.postedToday} posted today (${today}), ${discovered} newly found this scan, ${active} open`,
    );
  }

  return summaries;
}
