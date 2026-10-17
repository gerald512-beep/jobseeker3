import { matchesKeywords } from "./keywords";
import { parseAshbyLocation, isUSJob } from "./location";
import type { Company, ScannedJob } from "@/types";

interface AshbyAddress {
  postalAddress?: {
    addressCountry?: string;
    addressRegion?: string;
    addressLocality?: string;
  };
}

interface AshbyJob {
  id?: string;
  title?: string;
  jobUrl?: string;
  publishedAt?: string;
  location?: string;
  secondaryLocations?: { location?: string }[];
  address?: AshbyAddress;
  team?: { name?: string };
  department?: { name?: string };
}

interface AshbyResponse {
  jobs?: AshbyJob[];
}

export async function fetchAshby(company: Company): Promise<ScannedJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${company.slug}?includeCompensation=false`;

  let data: AshbyResponse;
  try {
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) {
      console.error(`[ashby] ${company.slug} HTTP ${res.status}`);
      return [];
    }
    data = await res.json() as AshbyResponse;
  } catch (err) {
    console.error(`[ashby] ${company.slug} fetch error:`, err);
    return [];
  }

  const jobs: ScannedJob[] = [];

  for (const job of data.jobs ?? []) {
    const title = job.title?.trim() ?? "";
    const dept = job.department?.name ?? job.team?.name ?? null;

    if (!matchesKeywords(title, dept, company.category)) continue;

    const rawLoc = job.location ?? null;
    const countryCode = job.address?.postalAddress?.addressCountry ?? null;
    const loc = parseAshbyLocation(rawLoc, countryCode);

    if (!isUSJob(loc)) continue;

    const id = `as-${company.slug}-${job.id}`;
    const applyUrl =
      job.jobUrl ??
      `https://jobs.ashbyhq.com/${company.slug}/${job.id}`;

    const createdAt = job.publishedAt ? job.publishedAt.split("T")[0] : null;

    jobs.push({
      id,
      source: "ashby",
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

  console.log(`[ashby:${company.slug}] ${jobs.length} matching ${company.category} jobs`);
  return jobs;
}
