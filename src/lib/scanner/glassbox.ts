import { matchesKeywords } from "./keywords";
import type { Company, ScannedJob } from "@/types";

const CAREERS_URL = "https://www.glassbox.com/careers/";
const JOB_LINK_RE = /href="\/careers\/(\d+)\/([^/"]+)\/([^/"]+)\/"/g;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function isUS(locationSlug: string): boolean {
  return locationSlug.startsWith("usa") || locationSlug === "united-states";
}

function slugToTitle(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function extractTitle(html: string, jobId: string, slug: string): string {
  const re = new RegExp(
    `href="/careers/${jobId}/${slug}/[^"]*"[^>]*>[\\s\\S]{0,200}?job-listing__job-title[^>]*>([^<]+)<`
  );
  const m = html.match(re);
  return m ? m[1].trim() : slugToTitle(slug);
}

export async function fetchGlassbox(company: Company): Promise<ScannedJob[]> {
  let html: string;
  try {
    const res = await fetch(CAREERS_URL, { headers: HEADERS });
    if (!res.ok) { console.error(`[glassbox] HTTP ${res.status}`); return []; }
    html = await res.text();
  } catch (err) {
    console.error("[glassbox] fetch error:", err);
    return [];
  }

  const jobs: ScannedJob[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;

  while ((m = JOB_LINK_RE.exec(html)) !== null) {
    const [, jobId, slug, locationSlug] = m;
    if (!isUS(locationSlug) || seen.has(jobId)) continue;
    seen.add(jobId);

    const title = extractTitle(html, jobId, slug);
    if (!matchesKeywords(title, null, company.category)) continue;

    const remote = locationSlug.includes("remote");
    const display = remote ? "Remote (US)" : "United States";

    jobs.push({
      id: `glassbox-${jobId}`,
      source: "glassbox",
      slug: company.slug,
      label: company.label,
      title,
      location: display,
      country: "US",
      region: null,
      city: null,
      remote,
      locationConfidence: "high",
      url: `https://www.glassbox.com/careers/${jobId}/${slug}/${locationSlug}/`,
      department: null,
      createdAt: null,
      category: company.category,
    });
  }

  console.log(`[glassbox] ${jobs.length} matching CX jobs`);
  return jobs;
}
