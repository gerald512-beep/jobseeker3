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
import type { ScannedJob } from "@/types";
import type { PrismaClient } from "@/generated/prisma";

export interface ScanResult {
  jobs: ScannedJob[];
  newJobCount: number;
  totalJobs: number;
  isBaseline: boolean;
  error?: string;
}

export async function runScan(db: PrismaClient): Promise<ScanResult> {
  const allJobs: ScannedJob[] = [];

  // Fetch all companies concurrently
  await Promise.all(
    COMPANIES.map(async (company) => {
      let jobs: ScannedJob[] = [];
      if (company.source === "greenhouse") {
        jobs = await fetchGreenhouse(company);
      } else if (company.source === "ashby") {
        jobs = await fetchAshby(company);
      } else if (company.source === "smartrecruiters") {
        jobs = await fetchSmartRecruiters(company);
      } else if (company.source === "waymo") {
        jobs = await fetchWaymo(company);
      } else if (company.source === "ebay") {
        jobs = await fetchEbay(company);
      } else if (company.source === "uber") {
        jobs = await fetchUber(company);
      } else if (company.source === "medallia") {
        jobs = await fetchMedallia(company);
      } else if (company.source === "qualtrics") {
        jobs = await fetchQualtrics(company);
      } else if (company.source === "glassbox") {
        jobs = await fetchGlassbox(company);
      } else if (company.source === "workday") {
        jobs = await fetchWorkday(company);
      } else if (company.source === "teamtailor") {
        jobs = await fetchTeamtailor(company);
      } else if (company.source === "lever") {
        jobs = await fetchLever(company);
      } else if (company.source === "adobe") {
        jobs = await fetchAdobe(company);
      } else if (company.source === "tiktok") {
        jobs = await fetchTikTok(company);
      }
      allJobs.push(...jobs);
    }),
  );

  // Check if this is the first ever scan (baseline)
  const previousCount = await db.scanRun.count();
  const isBaseline = previousCount === 0;

  // Load existing jobs for change detection (exclude adzuna search results)
  const existingRows = await db.job.findMany({
    where: { source: { not: "adzuna" } },
    select: { id: true, title: true, location: true, createdAt: true },
  });
  const existingMap = new Map(existingRows.map((j: { id: string; title: string; location: string | null; createdAt: string | null }) => [j.id, j]));
  const existingIds = new Set(existingMap.keys());

  const dedupedJobs = [...new Map(allJobs.map((j) => [j.id, j])).values()];
  const currentIds = new Set(dedupedJobs.map((j) => j.id));
  const newJobs = dedupedJobs.filter((j) => !existingIds.has(j.id));

  // Jobs with changed title, location, or posted date — treat as new
  const changedJobs = dedupedJobs.filter((j) => {
    const ex = existingMap.get(j.id);
    if (!ex) return false;
    return ex.title !== j.title || ex.location !== j.location || ex.createdAt !== j.createdAt;
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCutoff = thirtyDaysAgo.toISOString().split("T")[0];

  // Soft-delete jobs no longer returned by any API
  const staleIds = [...existingIds].filter((id) => !currentIds.has(id));
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
          isNew: !isBaseline && (job.createdAt ? job.createdAt >= recentCutoff : false),
        },
      }),
    ),
  ]);

  // Record the scan run
  await db.scanRun.create({
    data: {
      isBaseline,
      newJobCount: isBaseline ? 0 : newJobs.length,
      totalJobs: allJobs.length,
    },
  });

  const updatedCount = isBaseline ? 0 : changedJobs.length;
  if (updatedCount > 0) console.log(`[scan] Updated ${updatedCount} changed jobs.`);
  console.log(
    `[scan] ${isBaseline ? "Baseline" : "Delta"} scan complete. ` +
    `Total: ${allJobs.length} matching jobs. New: ${isBaseline ? 0 : newJobs.length}. Updated: ${updatedCount}.`,
  );

  return {
    jobs: allJobs,
    newJobCount: isBaseline ? 0 : newJobs.length,
    totalJobs: allJobs.length,
    isBaseline,
  };
}
