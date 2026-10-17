import { matchesKeywords } from "./keywords";
import { parseGreenhouseLocation, isUSJob } from "./location";
import type { Company, ScannedJob } from "@/types";

interface GHLocation {
  name?: string;
}

interface GHJob {
  id?: number | string;
  title?: string;
  absolute_url?: string;
  first_published?: string;
  departments?: { name?: string }[];
  offices?: { location?: { name?: string } }[];
  location?: GHLocation;
}

interface GHResponse {
  jobs?: GHJob[];
}

export async function fetchGreenhouse(company: Company): Promise<ScannedJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${company.slug}/jobs?content=true`;

  let data: GHResponse;
  try {
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) {
      console.error(`[greenhouse] ${company.slug} HTTP ${res.status}`);
      return [];
    }
    data = await res.json() as GHResponse;
  } catch (err) {
    console.error(`[greenhouse] ${company.slug} fetch error:`, err);
    return [];
  }

  const jobs: ScannedJob[] = [];

  for (const job of data.jobs ?? []) {
    const title = job.title?.trim() ?? "";
    const dept = job.departments?.[0]?.name ?? null;

    if (!matchesKeywords(title, dept, company.category)) continue;

    const rawLoc = job.location?.name ?? null;
    const loc = parseGreenhouseLocation(rawLoc);

    if (!isUSJob(loc)) continue;

    const id = `gh-${company.slug}-${job.id}`;
    const applyUrl =
      job.absolute_url?.includes("greenhouse.io")
        ? job.absolute_url
        : `https://job-boards.greenhouse.io/${company.slug}/jobs/${job.id}`;

    const createdRaw = job.first_published;
    const createdAt = createdRaw ? createdRaw.split("T")[0] : null;

    jobs.push({
      id,
      source: "greenhouse",
      slug: company.slug,
      label: company.label,
      title,
      location: loc.display,
      country: loc.country,
      region: loc.region,
      city: loc.city,
      remote: loc.remote,
      locationConfidence: loc.confidence,
      url: applyUrl,
      department: dept,
      createdAt,
      category: company.category,
    });
  }

  return jobs;
}
