import { matchesKeywords } from "./keywords";
import type { Company, ScannedJob } from "@/types";

const PAGE_SIZE = 20;

interface WDListing {
  title?: string;
  externalPath?: string;
  locationsText?: string;
  bulletFields?: string | string[];
}

interface WDListResponse {
  total?: number;
  jobPostings?: WDListing[];
}

interface WDDetail {
  jobPostingInfo?: {
    location?: string;
    additionalLocations?: string[];
    startDate?: string;
    jobReqId?: string;
    remoteType?: string;
    externalUrl?: string;
  };
}

const US_STATES = new Set([
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
  "District of Columbia",
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]);

function isUS(loc: string): boolean {
  if (!loc) return false;
  if (loc.includes("United States") || /^US\s*[-–]/.test(loc)) return true;
  // "City, State" or "City, ST" format
  const parts = loc.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (US_STATES.has(last) || US_STATES.has(last.split(/\s+/)[0])) return true;
  }
  return false;
}

function reqId(job: WDListing): string {
  const f = job.bulletFields;
  return (Array.isArray(f) ? f[0] : f) ?? "";
}

async function fetchDetail(detailBase: string, externalPath: string): Promise<WDDetail | null> {
  const path = externalPath.startsWith("/") ? externalPath.slice(1) : externalPath;
  try {
    const res = await fetch(`${detailBase}/${path}`, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    });
    if (!res.ok) return null;
    return await res.json() as WDDetail;
  } catch {
    return null;
  }
}

export async function fetchWorkday(company: Company): Promise<ScannedJob[]> {
  const tenant = company.slug;
  const instance = company.wdInstance ?? "wd1";
  const board = company.wdBoard ?? company.slug;
  const listBase = `https://${tenant}.${instance}.myworkdayjobs.com/wday/cxs/${tenant}/${board}/jobs`;
  const detailBase = `https://${tenant}.${instance}.myworkdayjobs.com/wday/cxs/${tenant}/${board}`;

  // Paginate through all job listings
  const allListings: WDListing[] = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    try {
      const res = await fetch(listBase, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
        body: JSON.stringify({ appliedFacets: {}, limit: PAGE_SIZE, offset, searchText: "" }),
      });
      if (!res.ok) break;
      const data = await res.json() as WDListResponse;
      // Workday only returns total on the first page
      if (offset === 0) total = data.total ?? 0;
      if (!data.jobPostings?.length) break;
      allListings.push(...data.jobPostings);
      offset += PAGE_SIZE;
    } catch {
      break;
    }
  }

  const jobs: ScannedJob[] = [];

  for (const listing of allListings) {
    const title = listing.title?.trim() ?? "";
    if (!matchesKeywords(title, null, company.category)) continue;

    const locText = listing.locationsText ?? "";
    const isMultiLoc = /^\d+ Locations$/.test(locText);
    const isSingleUS = !isMultiLoc && isUS(locText);

    // Skip clearly non-US single-location jobs without a fetch
    if (!isMultiLoc && !isSingleUS) continue;

    // Fetch detail for US confirmation (multi-loc) and real date (all matches)
    const detail = await fetchDetail(detailBase, listing.externalPath ?? "");
    if (!detail?.jobPostingInfo) continue;
    const info = detail.jobPostingInfo;

    if (isMultiLoc) {
      const allLocs = [info.location ?? "", ...(info.additionalLocations ?? [])];
      if (!allLocs.some(isUS)) continue;
    }

    const id = reqId(listing) || (listing.externalPath?.split("_").pop() ?? "");
    const remote = /remote/i.test(locText) || /remote/i.test(info.location ?? "");
    const display = isMultiLoc ? "Multiple US Locations" : locText;
    const url = info.externalUrl ?? `https://${tenant}.${instance}.myworkdayjobs.com/en-US/${board}${listing.externalPath}`;

    jobs.push({
      id: `workday-${tenant}-${id}`,
      source: "workday",
      slug: company.slug,
      label: company.label,
      title,
      location: display,
      country: "US",
      region: null,
      city: null,
      remote,
      locationConfidence: "high",
      url,
      department: null,
      createdAt: info.startDate ?? null,
      category: company.category,
    });
  }

  console.log(`[workday:${tenant}] ${jobs.length} matching ${company.category} jobs`);
  return jobs;
}
