import { chromium } from "playwright";
import { matchesKeywords } from "./keywords";
import type { Company, ScannedJob } from "@/types";

const ORIGIN = "https://jobs.uber.com";
const SEARCH_PATH = "/api/jobs/search/?page=1&pagesize=1000";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

const STATE_ABBR: Record<string, string> = {
  "California": "CA", "New York": "NY", "Texas": "TX", "Washington": "WA",
  "Illinois": "IL", "Florida": "FL", "Arizona": "AZ", "Massachusetts": "MA",
  "Georgia": "GA", "Colorado": "CO", "Hawaii": "HI", "Tennessee": "TN",
};

interface UberLocation {
  City?: string | null;
  Region?: string | null;
  Country?: string | null;
}

interface UberJob {
  Id: string;
  Title: string;
  AdditionalText?: string | null;
  DisplayDate?: string | null;
  Remote?: boolean | null;
  Locations?: UberLocation[] | null;
}

// Cloudflare rejects Node's fetch, so the API is called from inside a real browser page
async function fetchAllJobs(): Promise<UberJob[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent: UA });
    await page.goto(`${ORIGIN}/en/jobs/`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const { status, jobs } = await page.evaluate(async (path) => {
      const res = await fetch(path);
      if (!res.ok) return { status: res.status, jobs: [] };
      const data = await res.json() as { jobs?: Record<string, unknown>[] };
      // Drop descriptions in-page; the full payload is ~4MB
      const jobs = (data.jobs ?? []).map(({ Id, Title, AdditionalText, DisplayDate, Remote, Locations }) =>
        ({ Id, Title, AdditionalText, DisplayDate, Remote, Locations }));
      return { status: res.status, jobs };
    }, SEARCH_PATH);
    if (status !== 200) console.error(`[uber] API HTTP ${status}`);
    return jobs as UberJob[];
  } finally {
    await browser.close();
  }
}

export async function fetchUber(company: Company): Promise<ScannedJob[]> {
  let allJobs: UberJob[];
  try {
    allJobs = await fetchAllJobs();
  } catch (err) {
    console.error("[uber] fetch error:", err);
    return [];
  }

  const usJobs = allJobs.filter((j) => (j.Locations ?? []).some((l) => l.Country === "United States"));
  console.log(`[uber] ${allJobs.length} total, ${usJobs.length} US jobs`);

  const results: ScannedJob[] = [];

  for (const job of usJobs) {
    const title = job.Title?.trim() ?? "";
    const dept = job.AdditionalText ?? null;
    if (!matchesKeywords(title, dept, company.category)) continue;

    const usLoc = (job.Locations ?? []).find((l) => l.Country === "United States");
    const region = usLoc?.Region ?? null;
    const regionAbbr = region ? (STATE_ABBR[region] ?? region) : null;
    const city = usLoc?.City ?? null;
    const remote = job.Remote ?? false;
    const display = [city, regionAbbr].filter(Boolean).join(", ") || (remote ? "Remote (US)" : "United States");

    results.push({
      id: `ub-${job.Id}`,
      source: "uber",
      slug: company.slug,
      label: company.label,
      title,
      location: display,
      country: "US",
      region: regionAbbr,
      city,
      remote,
      locationConfidence: city ? "high" : "medium",
      url: `${ORIGIN}/en/jobs/${job.Id}/`,
      department: dept,
      createdAt: job.DisplayDate ? job.DisplayDate.split("T")[0] : null,
      category: company.category,
    });
  }

  console.log(`[uber] ${results.length} matching ${company.category} jobs`);
  return results;
}
