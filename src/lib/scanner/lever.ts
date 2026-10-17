import { matchesKeywords } from "./keywords";
import { parseGreenhouseLocation, isUSJob } from "./location";
import type { Company, ScannedJob } from "@/types";

interface LeverJob {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt: number;
  categories: {
    location?: string;
    team?: string;
    department?: string;
  };
}

export async function fetchLever(company: Company): Promise<ScannedJob[]> {
  const url = `https://api.lever.co/v0/postings/${company.slug}?mode=json`;

  let jobs: LeverJob[];
  try {
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) {
      console.error(`[lever:${company.slug}] HTTP ${res.status}`);
      return [];
    }
    jobs = await res.json() as LeverJob[];
  } catch (err) {
    console.error(`[lever:${company.slug}] fetch error:`, err);
    return [];
  }

  const results: ScannedJob[] = [];

  for (const job of jobs ?? []) {
    const title = job.text?.trim() ?? "";
    const dept = job.categories?.team ?? job.categories?.department ?? null;

    if (!matchesKeywords(title, dept, company.category)) continue;

    const loc = parseGreenhouseLocation(job.categories?.location ?? null);
    if (!isUSJob(loc)) continue;

    const createdAt = job.createdAt ? new Date(job.createdAt).toISOString().split("T")[0] : null;

    results.push({
      id: `lv-${company.slug}-${job.id}`,
      source: "lever",
      slug: company.slug,
      label: company.label,
      title,
      location: loc.display,
      country: loc.country,
      region: loc.region,
      city: loc.city,
      remote: loc.remote,
      locationConfidence: loc.confidence,
      url: job.hostedUrl,
      department: dept,
      createdAt,
      category: company.category,
    });
  }

  console.log(`[lever:${company.slug}] ${results.length} matching ${company.category} jobs`);
  return results;
}
