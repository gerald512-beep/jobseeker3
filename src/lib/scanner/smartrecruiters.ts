import { matchesKeywords } from "./keywords";
import { parseSmartRecruitersLocation, isUSJob } from "./location";
import type { Company, ScannedJob } from "@/types";

interface SRLocation {
  city?: string;
  region?: string;
  country?: string;
  remote?: boolean;
}

interface SRJobType {
  label?: string;
}

interface SRDepartment {
  label?: string;
}

interface SRPosting {
  id?: string;
  name?: string;
  location?: SRLocation;
  department?: SRDepartment;
  typeOfEmployment?: SRJobType;
  releasedDate?: string;
}

interface SRResponse {
  content?: SRPosting[];
  totalFound?: number;
}

export async function fetchSmartRecruiters(company: Company): Promise<ScannedJob[]> {
  const allPostings: SRPosting[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `https://api.smartrecruiters.com/v1/companies/${company.slug}/postings?limit=${limit}&offset=${offset}`;
    let data: SRResponse;
    try {
      const res = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!res.ok) {
        console.error(`[smartrecruiters] ${company.slug} HTTP ${res.status}`);
        break;
      }
      data = await res.json() as SRResponse;
    } catch (err) {
      console.error(`[smartrecruiters] ${company.slug} fetch error:`, err);
      break;
    }
    const page = data.content ?? [];
    allPostings.push(...page);
    if (allPostings.length >= (data.totalFound ?? 0) || page.length < limit) break;
    offset += limit;
  }

  const jobs: ScannedJob[] = [];

  for (const posting of allPostings) {
    const title = posting.name?.trim() ?? "";
    const dept = posting.department?.label ?? null;

    if (!matchesKeywords(title, dept, company.category)) continue;

    const l = posting.location;
    const isRemote = l?.remote === true || title.toLowerCase().includes("remote");
    const loc = parseSmartRecruitersLocation(
      l?.city ?? null,
      l?.region ?? null,
      l?.country ?? null,
      isRemote,
    );

    if (!isUSJob(loc)) continue;

    const id = `sr-${company.slug}-${posting.id}`;
    const applyUrl = `https://jobs.smartrecruiters.com/${company.slug}/${posting.id}`;

    const createdAt = posting.releasedDate ? posting.releasedDate.split("T")[0] : null;

    jobs.push({
      id,
      source: "smartrecruiters",
      slug: company.slug,
      label: company.label,
      title,
      location: loc.display,
      country: loc.country,
      region: loc.region,
      city: loc.city,
      remote: loc.remote,
      locationConfidence: loc.confidence,
      url: applyUrl,
      department: dept,
      createdAt,
      category: company.category,
    });
  }

  return jobs;
}
