import { matchesKeywords } from "./keywords";
import { parseGreenhouseLocation } from "./location";
import type { Company, ScannedJob } from "@/types";

const API_URL = "https://api.lifeattiktok.com/api/v1/public/supplier/search/job/posts";
// The API rejects requests without the website-path header
const HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0",
  "website-path": "tiktok",
  "accept-language": "en-US",
  "portal-platform": "pc",
};
const PAGE_SIZE = 500;
const US_COUNTRY_CODE = "CN_6";

interface TTLocation {
  code?: string;
  en_name?: string | null;
  parent?: TTLocation | null;
}

interface TTJob {
  id: string;
  title: string;
  description?: string | null;
  requirement?: string | null;
  job_category?: { en_name?: string | null; parent?: { en_name?: string | null } | null } | null;
  city_info?: TTLocation | null;
}

interface TTResponse {
  code: number;
  data?: { count: number; job_post_list?: TTJob[] };
}

async function fetchPage(offset: number): Promise<TTResponse["data"] | null> {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        keyword: "", limit: PAGE_SIZE, offset,
        job_category_id_list: [], location_code_list: [], subject_id_list: [], recruitment_id_list: [],
      }),
    });
    if (!res.ok) {
      console.error(`[tiktok] HTTP ${res.status} at offset ${offset}`);
      return null;
    }
    const json = await res.json() as TTResponse;
    if (json.code !== 0 || !json.data) {
      console.error(`[tiktok] API code ${json.code} at offset ${offset}`);
      return null;
    }
    return json.data;
  } catch (err) {
    console.error(`[tiktok] fetch error at offset ${offset}:`, err);
    return null;
  }
}

// city_info is a chain: city → state → country
function locationChain(loc: TTLocation | null | undefined): TTLocation[] {
  const chain: TTLocation[] = [];
  for (let l = loc; l; l = l.parent) chain.push(l);
  return chain;
}

// TikTok exposes no posting date; ByteDance job IDs carry the creation time (Unix seconds) in the top 32 bits
function createdFromId(id: string): string | null {
  try {
    return new Date(Number(BigInt(id) >> BigInt(32)) * 1000).toISOString().split("T")[0];
  } catch {
    return null;
  }
}

export async function fetchTikTok(company: Company): Promise<ScannedJob[]> {
  const all: TTJob[] = [];
  let total = Infinity;
  for (let offset = 0; offset < total; offset += PAGE_SIZE) {
    const page = await fetchPage(offset);
    if (!page) break;
    total = page.count;
    all.push(...(page.job_post_list ?? []));
  }

  const usJobs = all.filter((j) => locationChain(j.city_info).at(-1)?.code === US_COUNTRY_CODE);
  console.log(`[tiktok] ${all.length} total, ${usJobs.length} US jobs`);

  const jobs: ScannedJob[] = [];

  for (const job of usJobs) {
    const title = job.title?.trim() ?? "";
    const dept = [job.job_category?.parent?.en_name, job.job_category?.en_name].filter(Boolean).join(" ") || null;
    const jd = `${title}\n${job.description ?? ""}\n${job.requirement ?? ""}`;
    const matched = company.jdKeywords
      ? company.jdKeywords.some((kw) => new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(jd))
      : matchesKeywords(title, dept, company.category);
    if (!matched) continue;

    const [city, state] = locationChain(job.city_info);
    const loc = parseGreenhouseLocation([city?.en_name, state?.en_name].filter(Boolean).join(", "));

    jobs.push({
      id: `tiktok-${job.id}`,
      source: "tiktok",
      slug: company.slug,
      label: company.label,
      title,
      location: loc.display,
      country: "US",
      region: loc.region,
      city: loc.city,
      remote: false,
      locationConfidence: loc.region ? "high" : "medium",
      url: `https://lifeattiktok.com/search/${job.id}`,
      department: dept,
      createdAt: createdFromId(job.id),
      category: company.category,
    });
  }

  console.log(`[tiktok] ${jobs.length} matching ${company.category} jobs`);
  return jobs;
}
