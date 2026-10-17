// Try moove.it (Italian mobility company) and moove.com
const urls = ["https://moove.com/careers", "https://moove.it/en/careers", "https://jobs.moove.com", "https://careers.moove.com"];
for (const url of urls) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "follow" });
    const html = await res.text();
    const gh = html.match(/greenhouse\.io\/([a-z0-9_-]+)/i);
    const ashby = html.match(/ashbyhq\.com\/([a-z0-9_-]+)/i);
    const lever = html.match(/lever\.co\/([a-z0-9_-]+)/i);
    const smart = html.match(/smartrecruiters\.com\/([a-z0-9_-]+)/i);
    console.log(url, "->", res.status, "| gh:", gh?.[1], "ashby:", ashby?.[1], "lever:", lever?.[1], "smart:", smart?.[1]);
    if (!gh && !ashby && !lever && !smart) console.log("  snippet:", html.slice(0, 200).replace(/\s+/g, " "));
  } catch (e) {
    console.log(url, "-> ERROR:", e.message);
  }
}
