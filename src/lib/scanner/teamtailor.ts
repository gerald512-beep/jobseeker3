import { matchesKeywords } from "./keywords";
import type { Company, ScannedJob, ParsedLocation } from "@/types";

interface TTAddress {
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
}

interface TTPlace {
  "@type"?: string;
  address?: TTAddress;
}

interface TTJobPosting {
  "@type"?: string;
  title?: string;
  datePosted?: string;
  identifier?: { value?: number | string };
  jobLocation?: TTPlace | TTPlace[];
  occupationalCategory?: string;
}

interface TTItem {
  id: string;
  title: string;
  url: string;
  date_published?: string;
  _jobposting?: TTJobPosting;
}

interface TTFeed {
  items?: TTItem[];
}

function parseLocation(posting: TTJobPosting): ParsedLocation {
  const rawLocs = posting.jobLocation
    ? Array.isArray(posting.jobLocation) ? posting.jobLocation : [posting.jobLocation]
    : [];

  const usLocs = rawLocs.filter((l) => l.address?.addressCountry === "US");
  if (usLocs.length === 0) {
    return { raw: null, country: null, region: null, city: null, remote: false, confidence: "none", display: "-" };
  }

  const cities = usLocs.map((l) => l.address?.addressLocality).filter(Boolean) as string[];
  const city = cities[0] ?? null;
  const display = cities.length > 1 ? cities.join(", ") : (city ?? "US");

  return {
    raw: display,
    country: "US",
    region: null,
    city,
    remote: false,
    confidence: "high",
    display,
  };
}

export async function fetchTeamtailor(company: Company): Promise<ScannedJob[]> {
  const domain = company.ttDomain;
  if (!domain) {
    console.error(`[teamtailor] ${company.slug} missing ttDomain`);
    return [];
  }

  const url = `https://${domain}/jobs.json`;
  let feed: TTFeed;
  try {
    const res = await fetch(url, { headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) {
      console.error(`[teamtailor] ${company.slug} HTTP ${res.status}`);
      return [];
    }
    feed = await res.json() as TTFeed;
  } catch (err) {
    console.error(`[teamtailor] ${company.slug} fetch error:`, err);
    return [];
  }

  const jobs: ScannedJob[] = [];

  for (const item of feed.items ?? []) {
    const posting = item._jobposting;
    const title = item.title?.trim() ?? "";
    const dept = posting?.occupationalCategory ?? null;

    if (!matchesKeywords(title, dept, company.category)) continue;

    const loc = parseLocation(posting ?? {});
    if (loc.country !== "US") continue;

    const jobId = posting?.identifier?.value ?? item.id;
    const createdAt = posting?.datePosted ? posting.datePosted.split("T")[0] : null;

    jobs.push({
      id: `tt-${company.slug}-${jobId}`,
      source: "teamtailor",
      slug: company.slug,
      label: company.label,
      title,
      location: loc.display,
      country: loc.country,
      region: loc.region,
      city: loc.city,
      remote: loc.remote,
      locationConfidence: loc.confidence,
      url: item.url,
      department: dept,
      createdAt,
      category: company.category,
    });
  }

  console.log(`[teamtailor:${company.slug}] ${jobs.length} matching ${company.category} jobs`);
  return jobs;
}
