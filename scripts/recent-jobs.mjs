const CUTOFF = "2026-07-01"; // last 5 days from 2026-07-06
const HEADERS = { "User-Agent": "Mozilla/5.0", Accept: "application/json" };
const US_STATES = new Set(["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"]);

function isUSLoc(loc) {
  if (!loc) return false;
  const l = loc.toLowerCase();
  if (l.includes("remote - us") || l.includes("remote us") || l.includes("united states")) return true;
  const parts = loc.split(",").map(p => p.trim());
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].toUpperCase().trim().split(/\s+/)[0];
    if (US_STATES.has(last)) return true;
  }
  return false;
}

function isRecent(dateStr) {
  return dateStr && dateStr.split("T")[0] >= CUTOFF;
}

const results = {};

// --- GREENHOUSE: Glean + Braze ---
for (const [label, slug] of [["Glean", "gleanwork"], ["Braze", "braze"]]) {
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`, { headers: HEADERS });
  const data = await res.json();
  const jobs = (data.jobs ?? [])
    .filter(j => isRecent(j.first_published) && isUSLoc(j.location?.name))
    .sort((a, b) => b.first_published.localeCompare(a.first_published))
    .map(j => ({
      date: j.first_published.split("T")[0],
      title: j.title,
      location: j.location?.name ?? "",
      dept: j.departments?.[0]?.name ?? "",
      url: j.absolute_url,
    }));
  results[label] = jobs;
}

// --- ASHBY: Airwallex ---
const ashbyRes = await fetch("https://api.ashbyhq.com/posting-api/job-board/airwallex?includeCompensation=false", { headers: HEADERS });
const ashbyData = await ashbyRes.json();
const airwallexJobs = (ashbyData.jobs ?? [])
  .filter(j => {
    const loc = j.location ?? j.locationName ?? "";
    const cc = j.locationCountryCode ?? j.countryCode ?? "";
    const isUS = cc.toUpperCase() === "US" || isUSLoc(loc);
    const date = j.publishedAt ?? j.createdAt ?? "";
    return isUS && isRecent(date);
  })
  .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
  .map(j => ({
    date: (j.publishedAt ?? "").split("T")[0],
    title: j.title,
    location: j.location ?? j.locationName ?? "",
    dept: j.team?.name ?? j.department ?? "",
    url: j.jobUrl ?? `https://jobs.ashbyhq.com/airwallex/${j.id}`,
  }));
results["Airwallex"] = airwallexJobs;

// --- EBAY: sitemap scrape ---
const sitemapRes = await fetch("https://jobs.ebayinc.com/sitemap.xml", { headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" } });
const sitemapXml = await sitemapRes.text();
const subSitemapUrls = [...sitemapXml.matchAll(/<loc>(https:\/\/jobs\.ebayinc\.com[^<]+\.xml)<\/loc>/g)].map(m => m[1]);

let allEbayEntries = [];
for (const url of subSitemapUrls) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) continue;
  const x = await r.text();
  const re = /<loc>(https:\/\/jobs\.ebayinc\.com\/us\/en\/job\/([^<]+))<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g;
  let m;
  while ((m = re.exec(x)) !== null) {
    const lastmod = m[3].split("T")[0];
    if (lastmod >= CUTOFF) allEbayEntries.push({ url: m[1], slug: m[2], lastmod });
  }
}

const ebayJobs = [];
for (const entry of allEbayEntries) {
  const pr = await fetch(entry.url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!pr.ok) continue;
  const html = await pr.text();
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) continue;
  let posting;
  try { posting = JSON.parse(match[1]); } catch { continue; }
  if (Array.isArray(posting)) posting = posting.find(p => p["@type"] === "JobPosting");
  if (!posting) continue;
  const country = (posting.jobLocation?.address?.addressCountry ?? "").toUpperCase();
  if (country !== "US" && country !== "USA" && country !== "UNITED STATES OF AMERICA") continue;
  const date = (posting.datePosted ?? entry.lastmod).split("T")[0];
  if (date < CUTOFF) continue;
  ebayJobs.push({
    date,
    title: posting.title ?? "",
    location: [posting.jobLocation?.address?.addressLocality, posting.jobLocation?.address?.addressRegion].filter(Boolean).join(", "),
    dept: posting.occupationalCategory ?? "",
    url: entry.url,
  });
}
ebayJobs.sort((a, b) => b.date.localeCompare(a.date));
results["eBay"] = ebayJobs;

// --- WAYMO: try direct API ---
try {
  const waymoRes = await fetch("https://careers.withwaymo.com/jobs/search?page=1&per_page=100", { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } });
  if (waymoRes.ok) {
    const waymoData = await waymoRes.json();
    const waymoJobs = (waymoData.jobs ?? waymoData.results ?? [])
      .filter(j => {
        const loc = (j.location ?? j.city ?? "").toLowerCase();
        const isUS = loc.includes("united states") || loc.includes(", ca") || loc.includes(", wa") || US_STATES.has((loc.split(",").pop() ?? "").trim().toUpperCase());
        const date = j.updated_at ?? j.created_at ?? j.posted_at ?? "";
        return isUS && isRecent(date);
      })
      .map(j => ({
        date: (j.updated_at ?? j.created_at ?? "").split("T")[0],
        title: j.title,
        location: j.location ?? j.city ?? "",
        dept: j.department ?? j.team ?? "",
        url: j.url ?? j.apply_url ?? "",
      }));
    results["Waymo"] = waymoJobs;
  } else {
    results["Waymo"] = [{ note: `HTTP ${waymoRes.status} — Waymo requires Playwright scraping` }];
  }
} catch (e) {
  results["Waymo"] = [{ note: "Waymo API not directly accessible: " + e.message }];
}

// --- PRINT RESULTS ---
for (const [company, jobs] of Object.entries(results)) {
  console.log(`\n=== ${company} (${jobs.length} US jobs, last 5 days) ===`);
  if (jobs.length === 0) { console.log("  None"); continue; }
  for (const j of jobs) {
    if (j.note) { console.log(" ", j.note); continue; }
    console.log(`[${j.date}] [${j.dept}] ${j.title} | ${j.location}`);
    console.log(`  ${j.url}`);
  }
}
