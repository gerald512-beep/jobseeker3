import { fetchGreenhouse } from "./greenhouse";
import { fetchAshby } from "./ashby";
import { fetchSmartRecruiters } from "./smartrecruiters";
import { fetchWaymo } from "./waymo";
import { fetchEbay } from "./ebay";
import { fetchUber } from "./uber";
import { fetchMedallia } from "./medallia";
import { fetchQualtrics } from "./qualtrics";
import { fetchGlassbox } from "./glassbox";
import { fetchWorkday } from "./workday";
import { fetchTeamtailor } from "./teamtailor";
import { fetchLever } from "./lever";
import { fetchAdobe } from "./adobe";
import { fetchTikTok } from "./tiktok";
import { COMPANIES } from "./companies";
import { companyKey, recordDailyStats, type DailySummary } from "./daily";
import type { Company, ScannedJob, Source } from "@/types";
import type { PrismaClient } from "@/generated/prisma";

export interface ScanResult {
  jobs: ScannedJob[];
  newJobCount: number;
  totalJobs: number;
  isBaseline: boolean;
  failures: string[];
  daily: DailySummary[];
  error?: string;
}

const FETCHERS: Record<Source, (company: Company) => Promise<ScannedJob[]>> = {
  greenhouse: fetchGreenhouse,
  ashby: fetchAshby,
  smartrecruiters: fetchSmartRecruiters,
  waymo: fetchWaymo,
  ebay: fetchEbay,
  uber: fetchUber,
  medallia: fetchMedallia,
  qualtrics: fetchQualtrics,
  glassbox: fetchGlassbox,
  workday: fetchWorkday,
  teamtailor: fetchTeamtailor,
  lever: fetchLever,
  adobe: fetchAdobe,
  tiktok: fetchTikTok,
};

export async function runScan(db: PrismaClient): Promise<ScanResult> {
  const allJobs: ScannedJob[] = [];
  const failures: string[] = [];
  const failedKeys = new Set<string>();

  // Fetch all companies concurrently. A fetcher that throws is recorded as failed, and its
  // existing jobs are left alone rather than marked inactive.
  await Promise.all(
    COMPANIES.map(async (company) => {
      try {
        allJobs.push(...(await FETCHERS[company.source](company)));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failedKeys.add(companyKey(company));
        failures.push(`${company.source}/${company.slug} (${company.category}): ${message}`);
        console.error(`[scan] ${company.source}/${company.slug} (${company.category}) failed: ${message}`);
      }
    }),
  );

  // Check if this is the first ever scan (baseline)
  const previousCount = await db.scanRun.count();
  const isBaseline = previousCount === 0;

  // Load existing jobs for change detection (exclude adzuna search results)
  const existingRows = await db.job.findMany({
    where: { source: { not: "adzuna" } },
    select: { id: true, title: true, location: true, createdAt: true, isActive: true, source: true, slug: true, category: true },
  });
  const existingMap = new Map(existingRows.map((j) => [j.id, j]));
  const existingIds = new Set(existingMap.keys());

  // Tracker boards (trackAll) are counted in the daily record, not in the S&O/CX new/total counts
  const trackedCompanies = COMPANIES.filter((c) => c.trackAll);
  const trackedKeys = new Set(trackedCompanies.map(companyKey));
  const isTracked = (j: ScannedJob) => trackedKeys.has(companyKey(j));
  // A category's first scan is its baseline: store its jobs without flagging them all as new
  const knownCategories = new Set(existingRows.map((j) => j.category));
  const isCategoryBaseline = (j: ScannedJob) => !knownCategories.has(j.category);

  const dedupedJobs = [...new Map(allJobs.map((j) => [j.id, j])).values()];
  const currentIds = new Set(dedupedJobs.map((j) => j.id));
  const newJobs = dedupedJobs.filter((j) => !existingIds.has(j.id));
  const countedNewJobs = newJobs.filter((j) => !isTracked(j));

  // Jobs with changed title, location, or posted date — treat as new
  const changedJobs = dedupedJobs.filter((j) => {
    const ex = existingMap.get(j.id);
    if (!ex) return false;
    return ex.title !== j.title || ex.location !== j.location || ex.createdAt !== j.createdAt;
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCutoff = thirtyDaysAgo.toISOString().split("T")[0];

  // Soft-delete active jobs no longer returned by any API (skipping companies whose fetch failed)
  const staleIds = existingRows
    .filter((j) => j.isActive && !currentIds.has(j.id) && !failedKeys.has(companyKey(j)))
    .map((j) => j.id);
  if (staleIds.length > 0) {
    await db.job.updateMany({ where: { id: { in: staleIds } }, data: { isActive: false } });
    console.log(`[scan] Marked ${staleIds.length} jobs inactive.`);
  }

  // Upsert all jobs — mark existing ones as not new, re-activate returning jobs
  await db.$transaction([
    db.job.updateMany({ where: {}, data: { isNew: false } }),
    db.job.updateMany({ where: { id: { in: [...currentIds] } }, data: { isActive: true } }),
    // Update changed jobs and reset firstSeenAt so they surface as new
    ...changedJobs.map((job) =>
      db.job.update({
        where: { id: job.id },
        data: {
          title: job.title,
          location: job.location,
          country: job.country,
          region: job.region,
          city: job.city,
          remote: job.remote,
          createdAt: job.createdAt,
          firstSeenAt: new Date(),
          isActive: true,
        },
      }),
    ),
    // Insert new jobs (skip existing)
    ...newJobs.map((job) =>
      db.job.create({
        data: {
          id: job.id,
          source: job.source,
          slug: job.slug,
          label: job.label,
          title: job.title,
          location: job.location,
          country: job.country,
          region: job.region,
          city: job.city,
          remote: job.remote,
          locationConfidence: job.locationConfidence,
          url: job.url,
          department: job.department,
          createdAt: job.createdAt,
          category: job.category,
          isNew: !isBaseline && !isCategoryBaseline(job) && (job.createdAt ? job.createdAt >= recentCutoff : false),
        },
      }),
    ),
  ]);

  const newJobCount = isBaseline ? 0 : countedNewJobs.length;
  const totalJobs = allJobs.filter((j) => !isTracked(j)).length;

  // Record the scan run
  await db.scanRun.create({
    data: {
      isBaseline,
      newJobCount,
      totalJobs,
      error: failures.length > 0 ? failures.join("; ") : null,
    },
  });

  // Daily record for tracker boards. Jobs stored on a category's baseline scan aren't counted as found that day.
  const discoveredByKey = new Map<string, number>();
  for (const job of newJobs) {
    if (!isTracked(job) || isBaseline || isCategoryBaseline(job)) continue;
    const key = companyKey(job);
    discoveredByKey.set(key, (discoveredByKey.get(key) ?? 0) + 1);
  }
  const daily = await recordDailyStats(db, trackedCompanies, discoveredByKey, failedKeys);

  const updatedCount = isBaseline ? 0 : changedJobs.length;
  if (updatedCount > 0) console.log(`[scan] Updated ${updatedCount} changed jobs.`);
  if (failures.length > 0) console.error(`[scan] ${failures.length} fetch(es) failed; their jobs were left as-is.`);
  console.log(
    `[scan] ${isBaseline ? "Baseline" : "Delta"} scan complete. ` +
    `Total: ${totalJobs} matching jobs. New: ${newJobCount}. Updated: ${updatedCount}.`,
  );

  return { jobs: allJobs, newJobCount, totalJobs, isBaseline, failures, daily };
}
