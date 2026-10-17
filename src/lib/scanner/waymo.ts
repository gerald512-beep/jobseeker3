import { chromium } from "playwright";
import { matchesKeywords } from "./keywords";
import { isUSJob } from "./location";
import type { Company, ScannedJob, ParsedLocation } from "@/types";

interface SitemapEntry {
  url: string;
  slug: string;
  lastmod: string;
}

interface JobPosting {
  title: string;
  datePosted?: string;
  jobLocation?: Array<{
    address?: {
      addressLocality?: string;
      addressRegion?: string;
      addressCountry?: string;
    };
  }>;
  identifier?: { value?: string };
}

const SLUG_KEYWORDS = [
  "operations", "strategy", "bizops", "biz-ops", "business-ops",
  "logistics", "marketplace", "revenue-ops", "growth-ops", "launch-ops",
];

function matchesSlug(slug: string): boolean {
  return SLUG_KEYWORDS.some((k) => slug.includes(k));
}

async function fetchSitemap(): Promise<SitemapEntry[]> {
  const res = await fetch("https://careers.withwaymo.com/sitemap.xml", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Sitemap HTTP ${res.status}`);
  const xml = await res.text();

  const entries: SitemapEntry[] = [];
  const re = /<loc>(https:\/\/careers\.withwaymo\.com\/jobs\/([^<]+))<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    entries.push({ url: m[1], slug: m[2], lastmod: m[3] });
  }
  return entries;
}

async function scrapeJobPage(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>,
  url: string,
): Promise<JobPosting | null> {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    const jsonLdText = await page.evaluate(() => {
      const el = document.querySelector('script[type="application/ld+json"]');
      return el ? el.textContent : null;
    });
    if (!jsonLdText) return null;
    return JSON.parse(jsonLdText) as JobPosting;
  } catch {
    return null;
  }
}

function parseWaymoLocation(posting: JobPosting): ParsedLocation {
  const locations = posting.jobLocation ?? [];
  // Prefer US locations if multiple
  const usloc = locations.find((l) => l.address?.addressCountry?.toUpperCase() === "US");
  const loc = usloc ?? locations[0];

  if (!loc?.address) {
    return { raw: null, country: null, region: null, city: null, remote: false, confidence: "none", display: "-" };
  }

  const { addressLocality: city, addressRegion: region, addressCountry: country } = loc.address;
  const cc = (country ?? "").toUpperCase();
  const isUS = cc === "US" || cc === "USA" || cc === "UNITED STATES";
  const STATE_ABBR: Record<string, string> = {
    "California": "CA", "Arizona": "AZ", "New York": "NY", "Texas": "TX",
    "Washington": "WA", "Illinois": "IL", "Florida": "FL", "Colorado": "CO",
    "Massachusetts": "MA", "Georgia": "GA", "Nevada": "NV", "Oregon": "OR",
    "Virginia": "VA", "North Carolina": "NC", "Ohio": "OH", "Michigan": "MI",
  };
  const regionAbbr = region ? (STATE_ABBR[region] ?? region) : null;
  const displayParts: string[] = [];
  if (city) displayParts.push(city);
  if (regionAbbr && isUS) displayParts.push(regionAbbr);

  return {
    raw: displayParts.join(", ") || null,
    country: isUS ? "US" : (cc || null),
    region: regionAbbr ?? null,
    city: city ?? null,
    remote: false,
    confidence: country ? "high" : "low",
    display: displayParts.join(", ") || "-",
  };
}

export async function fetchWaymo(company: Company): Promise<ScannedJob[]> {
  let sitemapEntries: SitemapEntry[];
  try {
    sitemapEntries = await fetchSitemap();
  } catch (err) {
    console.error("[waymo] sitemap fetch error:", err);
    return [];
  }

  // Filter by slug keywords first to avoid unnecessary browser launches
  const candidates = sitemapEntries.filter((e) => matchesSlug(e.slug));
  console.log(`[waymo] ${sitemapEntries.length} total jobs, ${candidates.length} slug-keyword matches`);

  if (candidates.length === 0) return [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const jobs: ScannedJob[] = [];

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  try {
    for (const entry of candidates) {
      const posting = await scrapeJobPage(page, entry.url);
      await delay(800 + Math.random() * 700);
      if (!posting) continue;

      const title = posting.title?.trim() ?? "";
      if (!matchesKeywords(title, null, company.category)) continue;

      const loc = parseWaymoLocation(posting);
      if (!isUSJob(loc)) continue;

      const datePosted = posting.datePosted
        ? posting.datePosted.split("T")[0]
        : entry.lastmod;

      const rawId = posting.identifier?.value ?? entry.slug;
      const id = `wm-${rawId}`;

      jobs.push({
        id,
        source: "waymo",
        slug: "waymo",
        label: company.label,
        title,
        location: loc.display,
        country: loc.country,
        region: loc.region,
        city: loc.city,
        remote: loc.remote,
        locationConfidence: loc.confidence,
        url: entry.url,
        department: null,
        createdAt: datePosted,
        category: company.category,
      });
    }
  } finally {
    await browser.close();
  }

  return jobs;
}
