import { matchesKeywords } from "../src/lib/scanner/keywords.ts";
import { matchesCXKeywords } from "../src/lib/scanner/cx-keywords.ts";

const BASE_URL = "https://www.qualtrics.com/careers/us/en/search-results";
const PAGE_SIZE = 10;
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function extractFromHtml(html) {
  const marker = '"eagerLoadRefineSearch":';
  const idx = html.indexOf(marker);
  if (idx === -1) return null;
  const jsonStart = html.indexOf("{", idx + marker.length);
  if (jsonStart === -1) return null;
  let depth = 0, i = jsonStart;
  while (i < html.length) {
    const ch = html[i];
    if (ch === '"') { i++; while (i < html.length) { if (html[i] === "\\") i++; else if (html[i] === '"') break; i++; } }
    else if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { i++; break; } }
    i++;
  }
  const raw = html.slice(jsonStart, i).replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'");
  try { return JSON.parse(raw); } catch { return null; }
}

async function fetchPage(from) {
  const params = { keywords: "" };
  if (from > 0) { params.from = String(from); params.s = "1"; }
  const res = await fetch(`${BASE_URL}?${new URLSearchParams(params)}`, { headers: HEADERS });
  if (!res.ok) return null;
  return extractFromHtml(await res.text());
}

const firstPage = await fetchPage(0);
const allRaw = [...(firstPage?.data?.jobs ?? [])];
const total = firstPage?.totalHits ?? 0;
for (let from = PAGE_SIZE; from < total; from += PAGE_SIZE) {
  const page = await fetchPage(from);
  if (page) allRaw.push(...(page.data?.jobs ?? []));
}

const usJobs = allRaw.filter(j => j.country === "United States");
console.log(`Total: ${allRaw.length} | US: ${usJobs.length}`);

const soMatches = [], cxMatches = [];
for (const j of usJobs) {
  const title = j.title?.trim() ?? "";
  const dept = j.department ?? null;
  const date = j.postedDate?.split("T")[0] ?? "unknown";
  const loc = `${j.city ?? ""}, ${j.state ?? ""}`.replace(/^, |, $/, "");
  const entry = `[${date}] [${dept}] ${title} | ${loc}`;
  if (matchesKeywords(title, dept, "so")) soMatches.push(entry);
  if (matchesKeywords(title, dept, "cx")) cxMatches.push(entry);
}

console.log(`\nS&O matches: ${soMatches.length}`);
soMatches.forEach(j => console.log(" ", j));
console.log(`\nCX matches: ${cxMatches.length}`);
cxMatches.forEach(j => console.log(" ", j));
