const CUTOFF = "2026-07-01";
const HEADERS = { "User-Agent": "Mozilla/5.0", Accept: "text/html" };

// US job IDs from the listing page
const US_JOBS = [
  { id: "8019916", title: "Autonomous Vehicle Detailer", location: "Miami, FL" },
  { id: "8019903", title: "Autonomous Vehicle Detailer", location: "Phoenix, AZ" },
  { id: "8003863", title: "Traveling Autonomous Vehicle (AV) Technician", location: "Phoenix, AZ / Las Vegas, NV / Miami, FL" },
  { id: "7997279", title: "Central Warranty Manager", location: "Phoenix, AZ" },
  { id: "7989451", title: "Autonomous Fleet Maintenance Manager", location: "Miami, FL" },
  { id: "7982316", title: "Network & Infrastructure Engineer", location: "Phoenix, AZ (Hybrid)" },
  { id: "7981208", title: "General Manager, Autonomous Vehicle Operations", location: "Las Vegas, NV" },
  { id: "7981139", title: "Autonomous Vehicle Technician (Level 1-4)", location: "Las Vegas, NV" },
  { id: "7981121", title: "Autonomous Vehicle Safety Manager", location: "Phoenix, AZ" },
  { id: "7980741", title: "Director/Head of Fleet Vehicle Procurement & Strategic Sourcing", location: "Multiple US (Hybrid)" },
  { id: "7945525", title: "Autonomous Vehicle Safety Manager", location: "Miami, FL" },
];

for (const job of US_JOBS) {
  try {
    const slug = job.id + "-" + job.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/,"");
    const res = await fetch(`https://careers.moove.io/jobs/${slug}`, { headers: HEADERS });
    const html = await res.text();
    // Look for date in JSON-LD or meta tags
    const ldMatch = html.match(/"datePosted"\s*:\s*"([^"]+)"/);
    const metaMatch = html.match(/datePosted[^"]*"([0-9]{4}-[0-9]{2}-[0-9]{2})"/);
    const date = ldMatch?.[1] ?? metaMatch?.[1] ?? "unknown";
    const shortDate = date.split("T")[0];
    const isRecent = shortDate >= CUTOFF;
    console.log((isRecent ? "NEW " : "OLD ") + "[" + shortDate + "] " + job.title + " | " + job.location);
  } catch (e) {
    console.log("ERR " + job.title + ": " + e.message);
  }
}
