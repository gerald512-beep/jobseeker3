import { matchesKeywords } from "./keywords";
import { isUSJob } from "./location";
import type { Company, ScannedJob, ParsedLocation } from "@/types";

const SITEMAP_INDEX = "https://jobs.ebayinc.com/sitemap.xml";
const HEADERS = { "User-Agent": "Mozilla/5.0", Accept: "text/html,application/xhtml+xml" };
const CONCURRENCY = 5;

const SLUG_KEYWORDS = [
  "operations", "strategy", "bizops", "biz-ops", "business-ops",
  "marketplace", "logistics", "revenue-ops", "growth-ops", "launch-ops",
];

interface SitemapEntry {
  url: string;
  slug: string;
  lastmod: string;
}

interface JobPosting {
  "@type"?: string;
  title?: string;
  datePosted?: string;
  occupationalCategory?: string;
  identifier?: { value?: string };
  jobLocation?: {
    address?: {
      addressLocality?: string;
      addressRegion?: string;
      addressCountry?: string;
    };
  };
}

async function fetchSitemapUrls(): Promise<string[]> {
  const res = await fetch(SITEMAP_INDEX, { headers: HEADERS });
  if (!res.ok) throw new Error(`Sitemap index HTTP ${res.status}`);
  const xml = await res.text();
  const subSitemaps = [...xml.matchAll(/<loc>(https:\/\/jobs\.ebayinc\.com[^<]+\.xml)<\/loc>/g)].map((m) => m[1]);
  // If no sub-sitemaps, the main sitemap contains job URLs directly
  return subSitemaps.length > 0 ? subSitemaps : [SITEMAP_INDEX];
}

async function fetchJobEntries(sitemapUrl: string): Promise<SitemapEntry[]> {
  const res = await fetch(sitemapUrl, { headers: HEADERS });
  if (!res.ok) return [];
  const xml = await res.text();

  const entries: SitemapEntry[] = [];
  const re = /<loc>(https:\/\/jobs\.ebayinc\.com\/us\/en\/job\/([^<]+))<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    entries.push({ url: m[1], slug: m[2], lastmod: m[3].split("T")[0] });
  }
  return entries;
}

function matchesSlug(slug: string): boolean {
  return SLUG_KEYWORDS.some((k) => slug.toLowerCase().includes(k));
}

async function scrapeJobPage(url: string): Promise<JobPosting | null> {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!match) return null;
    const parsed = JSON.parse(match[1]) as JobPosting | JobPosting[];
    const posting = Array.isArray(parsed)
      ? parsed.find((p) => p["@type"] === "JobPosting")
      : parsed["@type"] === "JobPosting" ? parsed : null;
    return posting ?? null;
  } catch {
    return null;
  }
}

function parseEbayLocation(posting: JobPosting): ParsedLocation {
  const addr = posting.jobLocation?.address;
  if (!addr) {
    return { raw: null, country: null, region: null, city: null, remote: false, confidence: "none", display: "-" };
  }

  const { addressLocality: city, addressRegion: region, addressCountry: country } = addr;
  const cc = (country ?? "").toUpperCase();
  const isUS = cc === "US" || cc === "USA" || cc === "UNITED STATES" || cc === "UNITED STATES OF AMERICA";

  // Abbreviate full state names for display
  const STATE_ABBR: Record<string, string> = {
    "CALIFORNIA": "CA", "NEW YORK": "NY", "TEXAS": "TX", "WASHINGTON": "WA",
    "ILLINOIS": "IL", "FLORIDA": "FL", "ARIZONA": "AZ", "UTAH": "UT",
    "MASSACHUSETTS": "MA", "GEORGIA": "GA", "COLORADO": "CO", "OREGON": "OR",
    "NEVADA": "NV", "NORTH CAROLINA": "NC", "VIRGINIA": "VA", "OHIO": "OH",
    "DISTRICT OF COLUMBIA": "DC",
  };
  const regionAbbr = region ? (STATE_ABBR[region.toUpperCase()] ?? region) : null;
  const display = [city, regionAbbr].filter(Boolean).join(", ") || "-";

  return {
    raw: display,
    country: isUS ? "US" : (cc || null),
    region: regionAbbr,
    city: city ?? null,
    remote: false,
    confidence: country ? "high" : "low",
    display,
  };
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

export async function fetchEbay(company: Company): Promise<ScannedJob[]> {
  let sitemapUrls: string[];
  try {
    sitemapUrls = await fetchSitemapUrls();
  } catch (err) {
    console.error("[ebay] sitemap index error:", err);
    return [];
  }

  const allEntries: SitemapEntry[] = (
    await Promise.all(sitemapUrls.map(fetchJobEntries))
  ).flat();

  const candidates = allEntries.filter((e) => matchesSlug(e.slug));
  console.log(`[ebay] ${allEntries.length} total jobs, ${candidates.length} slug-keyword matches`);

  if (candidates.length === 0) return [];

  const tasks = candidates.map((entry) => async (): Promise<ScannedJob | null> => {
    const posting = await scrapeJobPage(entry.url);
    if (!posting) return null;

    const title = posting.title?.trim() ?? "";
    const dept = posting.occupationalCategory ?? null;
    if (!matchesKeywords(title, dept, company.category)) return null;

    const loc = parseEbayLocation(posting);
    if (!isUSJob(loc)) return null;

    const jobId = posting.identifier?.value ?? entry.slug;
    const createdAt = posting.datePosted ?? entry.lastmod;

    return {
      id: `eb-${jobId}`,
      source: "ebay",
      slug: company.slug,
      label: company.label,
      title,
      location: loc.display,
      country: loc.country,
      region: loc.region,
      city: loc.city,
      remote: loc.remote,
      locationConfidence: loc.confidence,
      url: entry.url,
      department: dept,
      createdAt,
      category: company.category,
    } satisfies ScannedJob;
  });

  const results = await runWithConcurrency(tasks, CONCURRENCY);
  return results.filter((j): j is ScannedJob => j !== null);
}
