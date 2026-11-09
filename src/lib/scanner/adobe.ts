import { matchesKeywords } from "./keywords";
import type { Company, ScannedJob } from "@/types";

const WIDGETS_URL = "https://careers.adobe.com/widgets";
const US = "United States of America";
// Phenom's default ordering shifts between requests, so small pages overlap and skip jobs.
// Max size is 500, which covers all US jobs in a single request.
const PAGE_SIZE = 500;

const US_STATE_ABBRS: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
  Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH",
  "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC",
  "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA",
  "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN",
  Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA",
  "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY", "District of Columbia": "DC",
};

interface PhenomJob {
  jobId: string;
  title: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  multi_location?: string[] | null;
  category?: string | null;
  postedDate?: string | null;
  applyUrl?: string | null;
}

interface RefineSearch {
  totalHits: number;
  data?: { jobs?: PhenomJob[] };
}

async function fetchPage(from: number): Promise<RefineSearch> {
  const res = await fetch(WIDGETS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Mozilla/5.0" },
    body: JSON.stringify({
      lang: "en_us", deviceType: "desktop", country: "us", pageName: "search-results",
      ddoKey: "refineSearch", from, size: PAGE_SIZE, jobs: true, counts: false,
      jdsource: "facets", siteType: "external", keywords: "", global: true,
      selected_fields: { country: [US] },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for from=${from}`);
  const data = await res.json() as { refineSearch?: RefineSearch };
  if (!data.refineSearch) throw new Error(`no refineSearch payload for from=${from}`);
  return data.refineSearch;
}

// Throws unless every US job was fetched, so a failed or partial fetch is never mistaken for jobs closing.
async function fetchAllUSJobs(): Promise<PhenomJob[]> {
  const byId = new Map<string, PhenomJob>();
  let totalHits = Infinity;
  for (let from = 0; from < totalHits; from += PAGE_SIZE) {
    const page = await fetchPage(from);
    totalHits = page.totalHits;
    for (const job of page.data?.jobs ?? []) byId.set(job.jobId, job);
  }
  if (byId.size < totalHits) throw new Error(`incomplete fetch: got ${byId.size} of ${totalHits} US jobs`);
  console.log(`[adobe] ${byId.size} US jobs`);
  return [...byId.values()];
}

// Several COMPANIES entries (S&O, CX, tracker) read the same board in one scan; share one fetch between them.
const SHARE_MS = 5 * 60 * 1000;
let shared: { startedAt: number; jobs: Promise<PhenomJob[]> } | null = null;

function getUSJobs(): Promise<PhenomJob[]> {
  if (!shared || Date.now() - shared.startedAt > SHARE_MS) {
    const jobs = fetchAllUSJobs();
    shared = { startedAt: Date.now(), jobs };
    jobs.catch(() => { if (shared?.jobs === jobs) shared = null; }); // don't reuse a failed fetch
  }
  return shared.jobs;
}

export async function fetchAdobe(company: Company): Promise<ScannedJob[]> {
  const usJobs = await getUSJobs();
  const jobs: ScannedJob[] = [];

  for (const job of usJobs) {
    const title = job.title?.trim() ?? "";
    const dept = job.category ?? null;

    if (!company.trackAll && !matchesKeywords(title, dept, company.category)) continue;

    // Multi-location jobs can have a non-US primary location; use their US location instead
    const usLoc = job.country === US ? null : job.multi_location?.find((l) => l.endsWith(US));
    const [city = null, state = null]: (string | null)[] = usLoc
      ? usLoc.split(", ")
      : [job.city ?? null, job.state ?? null];
    const regionAbbr = state ? (US_STATE_ABBRS[state] ?? null) : null;
    const isRemote = city?.toLowerCase().includes("remote") ?? false;

    const display = isRemote
      ? "Remote (US)"
      : [city, regionAbbr].filter(Boolean).join(", ") || "United States";

    const createdAt = job.postedDate ? job.postedDate.split("T")[0] : null;

    jobs.push({
      // Tracker rows get their own IDs so they never collide with the S&O/CX rows for the same posting
      id: company.trackAll ? `adobe-all-${job.jobId}` : `adobe-${job.jobId}`,
      source: "adobe",
      slug: company.slug,
      label: company.label,
      title,
      location: display,
      country: "US",
      region: isRemote ? null : regionAbbr,
      city: isRemote ? null : city,
      remote: isRemote,
      locationConfidence: isRemote ? "high" : (regionAbbr ? "high" : "medium"),
      url: job.applyUrl ?? `https://careers.adobe.com/us/en/job/${job.jobId}`,
      department: dept,
      createdAt,
      category: company.category,
    });
  }

  console.log(`[adobe] ${jobs.length} matching ${company.category} jobs`);
  return jobs;
}
