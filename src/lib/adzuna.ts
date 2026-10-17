export const TITLE_PHRASES = [
  "Customer Experience Manager",
  "Voice of the Customer",
  "customer journey",
] as const;

export interface AdzunaRaw {
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  redirect_url?: string;
  created?: string;
  salary_min?: number;
  salary_max?: number;
}

export interface NormalizedJob {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  postedAt: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
}

export function passesPostFilter(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes("customer experience manager") ||
    t.includes("voice of the customer") ||
    t.includes("customer journey")
  );
}

export function normalizeAndFilter(
  results: AdzunaRaw[],
  seen: Set<string> = new Set(),
): NormalizedJob[] {
  return results
    .map((r) => {
      const match = (r.redirect_url ?? "").match(/\/(?:ad|details)\/(\d+)/);
      const adzunaId = match ? match[1] : null;
      return {
        id: adzunaId ? `adzuna-${adzunaId}` : null,
        title: r.title ?? "",
        company: r.company?.display_name ?? "Unknown",
        location: r.location?.display_name ?? null,
        url: r.redirect_url ?? "",
        postedAt: r.created ? r.created.split("T")[0] : null,
        salaryMin: typeof r.salary_min === "number" ? r.salary_min : null,
        salaryMax: typeof r.salary_max === "number" ? r.salary_max : null,
      };
    })
    .filter((j): j is NormalizedJob & { id: string } => {
      if (!j.id) return false;
      if (seen.has(j.id)) return false;
      if (!passesPostFilter(j.title)) return false;
      seen.add(j.id);
      return true;
    }) as NormalizedJob[];
}

export function jobToDbRow(j: NormalizedJob, extra: { isNew: boolean } = { isNew: false }) {
  return {
    id: j.id,
    source: "adzuna" as const,
    slug: j.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/, ""),
    label: j.company,
    title: j.title,
    location: j.location,
    country: "US",
    region: null,
    city: null,
    remote: false,
    locationConfidence: "low",
    url: j.url,
    department: null,
    createdAt: j.postedAt,
    category: "search",
    isNew: extra.isNew,
  };
}

export async function fetchAdzunaPage(
  appId: string,
  appKey: string,
  phrase: string,
  page: number,
  opts: { maxDaysOld: number; where?: string },
): Promise<AdzunaRaw[]> {
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/us/search/${page}`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("what", phrase);
  url.searchParams.set("results_per_page", "50");
  url.searchParams.set("max_days_old", String(opts.maxDaysOld));
  url.searchParams.set("salary_min", "1");
  url.searchParams.set("what_exclude", "Concierge Specialist");
  url.searchParams.set("content-type", "application/json");
  if (opts.where?.trim()) url.searchParams.set("where", opts.where.trim());

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return data.results ?? [];
}
