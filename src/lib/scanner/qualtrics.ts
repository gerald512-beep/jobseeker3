import { matchesKeywords } from "./keywords";
import type { Company, ScannedJob } from "@/types";

const BASE_URL = "https://www.qualtrics.com/careers/us/en/search-results";
const PAGE_SIZE = 10;

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
  department?: string | null;
  postedDate?: string | null;
  jobUrl?: string | null;
}

interface PhenomResponse {
  status: number;
  hits: number;
  totalHits: number;
  data: { jobs: PhenomJob[] };
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function extractFromHtml(html: string): PhenomResponse | null {
  const marker = '"eagerLoadRefineSearch":';
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) return null;

  const jsonStart = html.indexOf("{", markerIdx + marker.length);
  if (jsonStart === -1) return null;

  let depth = 0;
  let i = jsonStart;
  while (i < html.length) {
    const ch = html[i];
    if (ch === '"') {
      i++;
      while (i < html.length) {
        if (html[i] === "\\") i++;
        else if (html[i] === '"') break;
        i++;
      }
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) { i++; break; }
    }
    i++;
  }

  const raw = html
    .slice(jsonStart, i)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  try {
    return JSON.parse(raw) as PhenomResponse;
  } catch {
    console.error("[qualtrics] JSON parse failed");
    return null;
  }
}

async function fetchPage(from: number): Promise<PhenomResponse | null> {
  const params: Record<string, string> = { keywords: "" };
  if (from > 0) { params.from = String(from); params.s = "1"; }

  const url = `${BASE_URL}?${new URLSearchParams(params)}`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.error(`[qualtrics] HTTP ${res.status} for from=${from}`);
      return null;
    }
    return extractFromHtml(await res.text());
  } catch (err) {
    console.error(`[qualtrics] fetch error for from=${from}:`, err);
    return null;
  }
}

export async function fetchQualtrics(company: Company): Promise<ScannedJob[]> {
  const firstPage = await fetchPage(0);
  if (!firstPage) return [];

  const allRaw: PhenomJob[] = [...(firstPage.data?.jobs ?? [])];
  const totalHits = firstPage.totalHits;

  for (let from = PAGE_SIZE; from < totalHits; from += PAGE_SIZE) {
    const page = await fetchPage(from);
    if (!page) break;
    allRaw.push(...(page.data?.jobs ?? []));
  }

  const usJobs = allRaw.filter((j) => j.country === "United States");
  console.log(`[qualtrics] ${allRaw.length} total, ${usJobs.length} US jobs`);

  const jobs: ScannedJob[] = [];

  for (const job of usJobs) {
    const title = job.title?.trim() ?? "";
    const dept = job.department ?? null;

    if (!matchesKeywords(title, dept, company.category)) continue;

    const city = job.city ?? null;
    const regionAbbr = job.state ? (US_STATE_ABBRS[job.state] ?? null) : null;
    const isRemote = city?.toLowerCase().includes("remote") ?? false;

    const display = isRemote
      ? "Remote (US)"
      : [city, regionAbbr].filter(Boolean).join(", ") || "United States";

    const createdAt = job.postedDate ? job.postedDate.split("T")[0] : null;

    jobs.push({
      id: `qual-${job.jobId}`,
      source: "qualtrics",
      slug: company.slug,
      label: company.label,
      title,
      location: display,
      country: "US",
      region: isRemote ? null : regionAbbr,
      city: isRemote ? null : city,
      remote: isRemote,
      locationConfidence: isRemote ? "high" : (regionAbbr ? "high" : "medium"),
      url: job.jobUrl ?? `https://www.qualtrics.com/careers/us/en/job/${job.jobId}`,
      department: dept,
      createdAt,
      category: company.category,
    });
  }

  return jobs;
}
