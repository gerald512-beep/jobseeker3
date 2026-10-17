const SITEMAP_INDEX = "https://jobs.ebayinc.com/sitemap.xml";
const HEADERS = { "User-Agent": "Mozilla/5.0", Accept: "text/html,application/xhtml+xml" };
const SLUG_KEYWORDS = ["operations", "strategy", "bizops", "biz-ops", "business-ops", "marketplace", "logistics", "revenue-ops", "growth-ops", "launch-ops"];

const res = await fetch(SITEMAP_INDEX, { headers: HEADERS });
const xml = await res.text();
const subSitemaps = [...xml.matchAll(/<loc>(https:\/\/jobs\.ebayinc\.com[^<]+\.xml)<\/loc>/g)].map(m => m[1]);
const sitemapUrls = subSitemaps.length > 0 ? subSitemaps : [SITEMAP_INDEX];

let allEntries = [];
for (const url of sitemapUrls) {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) continue;
  const x = await r.text();
  const re = /<loc>(https:\/\/jobs\.ebayinc\.com\/us\/en\/job\/([^<]+))<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g;
  let m;
  while ((m = re.exec(x)) !== null) allEntries.push({ url: m[1], slug: m[2], lastmod: m[3].split("T")[0] });
}

const candidates = allEntries.filter(e => SLUG_KEYWORDS.some(k => e.slug.toLowerCase().includes(k)));
console.log("Total jobs:", allEntries.length, "| Slug matches:", candidates.length);

for (const c of candidates) {
  const pr = await fetch(c.url, { headers: HEADERS });
  if (!pr.ok) { console.log("FETCH_ERR | " + c.slug); continue; }
  const html = await pr.text();
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) { console.log("NO_LD | " + c.slug); continue; }
  let posting;
  try { posting = JSON.parse(match[1]); } catch { continue; }
  if (Array.isArray(posting)) posting = posting.find(p => p["@type"] === "JobPosting");
  if (!posting) continue;
  const title = posting.title ?? "";
  const dept = posting.occupationalCategory ?? "";
  const addr = posting.jobLocation?.address ?? {};
  const country = (addr.addressCountry ?? "").toUpperCase();
  const region = addr.addressRegion ?? "";
  const city = addr.addressLocality ?? "";
  const isUS = country === "US" || country === "USA";
  const date = posting.datePosted ?? c.lastmod;
  console.log((isUS ? "US" : country || "?") + " | [" + dept + "] " + title + " | " + city + ", " + region + " | " + date);
}
