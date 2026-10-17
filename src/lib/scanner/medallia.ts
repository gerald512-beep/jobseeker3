import { matchesKeywords } from "./keywords";
import type { Company, ScannedJob } from "@/types";

const ENDPOINT = "https://jobs.medallia.com/api/jobs";
const HEADERS = {
  "Accept": "application/json, text/plain, */*",
  "Referer": "https://jobs.medallia.com/jobs",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
  "Cookie": "i18n=en-US; searchSource=external",
};
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

interface JibeJob {
  data: {
    slug: string;
    title: string;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    country_code?: string | null;
    location_type?: string;
    posted_date?: string | null;
    categories?: { name: string }[];
  };
}

interface JibeResponse {
  jobs?: JibeJob[];
  totalCount?: number;
  count?: number;
}

export async function fetchMedallia(company: Company): Promise<ScannedJob[]> {
  const allRaw: JibeJob[] = [];
  let page = 1;
  let totalCount = Infinity;

  while (allRaw.length < totalCount) {
    const params = new URLSearchParams({
      page: String(page),
      sortBy: "posted_date",
      descending: "true",
      internal: "false",
    });

    let data: JibeResponse;
    try {
      const res = await fetch(`${ENDPOINT}?${params}`, { headers: HEADERS });
      if (!res.ok) {
        console.error(`[medallia] HTTP ${res.status} on page ${page}`);
        break;
      }
      data = await res.json() as JibeResponse;
    } catch (err) {
      console.error(`[medallia] fetch error on page ${page}:`, err);
      break;
    }

    const pageJobs = data.jobs ?? [];
    if (pageJobs.length === 0) break;
    allRaw.push(...pageJobs);
    totalCount = data.totalCount ?? data.count ?? allRaw.length;
    if (allRaw.length >= totalCount) break;
    page++;
  }

  const usJobs = allRaw.filter((j) => j.data.country_code === "US");
  console.log(`[medallia] ${allRaw.length} total, ${usJobs.length} US jobs`);

  const jobs: ScannedJob[] = [];

  for (const job of usJobs) {
    const d = job.data;
    const title = d.title?.trim() ?? "";
    const dept = d.categories?.[0]?.name ?? null;

    if (!matchesKeywords(title, dept, company.category)) continue;

    const isRemote = d.location_type === "ANY";
    const regionAbbr = d.state ? (US_STATE_ABBRS[d.state] ?? null) : null;
    const city = d.city ?? null;

    let display: string;
    if (isRemote) {
      display = "Remote (US)";
    } else {
      const parts = [city, regionAbbr].filter(Boolean);
      display = parts.length > 0 ? parts.join(", ") : "United States";
    }

    const id = `md-${d.slug}`;
    const url = `https://jobs.medallia.com/jobs/${d.slug}?lang=en-us`;
    const createdAt = d.posted_date ? d.posted_date.split("T")[0] : null;

    jobs.push({
      id,
      source: "medallia",
      slug: company.slug,
      label: company.label,
      title,
      location: display,
      country: "US",
      region: regionAbbr,
      city,
      remote: isRemote,
      locationConfidence: isRemote ? "high" : (regionAbbr ? "high" : "medium"),
      url,
      department: dept,
      createdAt,
      category: company.category,
    });
  }

  return jobs;
}
