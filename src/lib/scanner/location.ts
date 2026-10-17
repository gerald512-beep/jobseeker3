import type { ParsedLocation, Confidence } from "@/types";

const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
};

const US_STATE_ABBRS = new Set(Object.keys(US_STATES));
const US_STATE_NAMES = new Set(Object.values(US_STATES).map((v) => v.toLowerCase()));

// Cities that are unambiguously outside the US
const KNOWN_NON_US_CITIES = new Set([
  // India
  "bengaluru", "bangalore", "mumbai", "delhi", "new delhi", "hyderabad",
  "chennai", "pune", "kolkata", "ahmedabad", "gurgaon", "noida",
  // Latin America
  "mexico city", "ciudad de mexico", "cdmx", "mexico",
  "são paulo", "sao paulo", "rio de janeiro", "bogota", "lima",
  "buenos aires", "santiago", "monterrey", "guadalajara",
  // Asia Pacific
  "singapore", "tokyo", "osaka", "shanghai", "beijing", "shenzhen",
  "hong kong", "seoul", "manila", "jakarta", "kuala lumpur", "taipei",
  "bangalore", "ho chi minh city", "hanoi",
  // Europe
  "london", "manchester", "dublin", "amsterdam", "paris", "berlin",
  "munich", "frankfurt", "stockholm", "oslo", "copenhagen", "zurich",
  "madrid", "barcelona", "milan", "rome", "warsaw", "prague",
  "budapest", "lisbon", "porto", "vienna", "brussels", "helsinki", "athens",
  "bucharest", "sofia",
  // Middle East / Africa
  "tel aviv", "dubai", "abu dhabi", "riyadh", "nairobi", "lagos",
  "cairo", "johannesburg",
  // Oceania
  "sydney", "melbourne", "brisbane", "perth", "auckland",
  // Canada (separate country)
  "toronto", "vancouver", "montreal", "ottawa", "calgary", "edmonton",
  // Other
  "ontario", "north york", "taguig", "taguig city", "makati", "cebu",
  // Bare country/region names
  "united kingdom", "uk", "england", "scotland", "ireland", "israel", "india", "canada",
  "germany", "france", "netherlands", "spain", "portugal", "poland", "italy", "sweden",
  "norway", "denmark", "finland", "switzerland", "austria", "belgium", "greece", "romania",
  "bulgaria", "czech republic", "czechia", "hungary", "ukraine", "serbia", "croatia",
  "estonia", "lithuania", "latvia", "turkey", "brazil", "argentina", "colombia", "chile",
  "peru", "costa rica", "philippines", "japan", "south korea", "korea", "china", "taiwan",
  "vietnam", "indonesia", "malaysia", "thailand", "australia", "new zealand",
  "united arab emirates", "uae", "saudi arabia", "egypt", "kenya", "nigeria", "south africa",
  "emea", "apac", "latam", "europe",
]);

function isKnownNonUS(cityStr: string): boolean {
  const lower = cityStr.toLowerCase().trim();
  if (KNOWN_NON_US_CITIES.has(lower)) return true;
  // Check each token in slash/multi-city strings like "London/Dublin"
  const parts = lower.split(/[/|,]/).map((p) => p.trim());
  return parts.length > 1 && parts.every((p) => KNOWN_NON_US_CITIES.has(p));
}

function buildDisplay(loc: Omit<ParsedLocation, "display">): string {
  if (loc.remote) {
    if (loc.country === "US") return "Remote (US)";
    if (loc.country) return `Remote (${loc.country})`;
    return "Remote";
  }
  const parts: string[] = [];
  if (loc.city) parts.push(loc.city);
  if (loc.region) parts.push(loc.region);
  if (loc.country && loc.country !== "US") parts.push(loc.country);
  return parts.length > 0 ? parts.join(", ") : (loc.raw ?? "-");
}

// Strategy 1: Greenhouse — free text like "San Francisco, CA" or "Remote - US"
export function parseGreenhouseLocation(raw: string | null | undefined): ParsedLocation {
  if (!raw || raw.trim() === "") {
    return { raw: null, country: null, region: null, city: null, remote: false, confidence: "none", display: "-" };
  }

  const s = raw.trim();
  const lower = s.toLowerCase();
  const isRemote = lower.includes("remote");
  // "Hybrid - City" is treated like "Remote - City" for country extraction purposes
  const isHybrid = lower.includes("hybrid");

  // Remote/Hybrid patterns — handles both "Remote - Country" and "Country - Remote"
  if (isRemote || isHybrid) {
    const modeWord = isRemote ? /remote/i : /hybrid/i;
    // Strip the mode word and surrounding delimiters to get the country/city part
    const rest = s
      .replace(modeWord, "")
      .replace(/[\-–—]/g, " ")
      .replace(/\(.*?\)/g, "")   // remove parenthetical qualifiers e.g. "(ON, AB, BC, or NS Only)"
      .replace(/\s+/g, " ")
      .trim();

    const US_INDICATORS = /^(us|usa|united states|united states of america)$/i;
    const restIsUS = US_INDICATORS.test(rest) || rest === "";
    const restIsNonUS = rest !== "" && !restIsUS;

    // If the non-mode part is a known non-US city, treat as non-US on-site (not remote)
    if (restIsNonUS && isKnownNonUS(rest)) {
      const loc = { raw: s, country: rest, region: null, city: rest, remote: false, confidence: "high" as Confidence, display: "" };
      return { ...loc, display: buildDisplay(loc) };
    }

    if (restIsUS || rest === "") {
      const conf: Confidence = rest === "" ? "low" : "high";
      const loc = { raw: s, country: "US", region: null, city: null, remote: true, confidence: conf, display: "" };
      return { ...loc, display: buildDisplay(loc) };
    }
    if (restIsNonUS) {
      // If it's a known non-US city/country, exclude
      if (isKnownNonUS(rest)) {
        const loc = { raw: s, country: rest, region: null, city: null, remote: true, confidence: "high" as Confidence, display: "" };
        return { ...loc, display: buildDisplay(loc) };
      }
      // Otherwise it's likely a US city list (e.g. "Hybrid - SF, NYC, Austin") — treat as US
      const loc = { raw: s, country: "US", region: null, city: null, remote: true, confidence: "medium" as Confidence, display: "" };
      return { ...loc, display: buildDisplay(loc) };
    }
  }

  // "CountryName - City" format for full country names (e.g. "Israel - Raanana", "United Kingdom - London", "USA - Atlanta, GA")
  // Only fires when country part is 3+ chars (2-char codes handled by ccPrefixMatch below)
  const longCountryDash = s.match(/^([A-Za-z][A-Za-z ]{2,}?)\s*[-–]\s*(.+)$/);
  if (longCountryDash) {
    const countryPart = longCountryDash[1].trim();
    const rest = longCountryDash[2].trim();
    const isUSCountry = /^(usa|united states|united states of america)$/i.test(countryPart);
    if (isUSCountry) {
      return parseGreenhouseLocation(rest);
    }
    const remoteRest = /remote/i.test(rest);
    const loc = { raw: s, country: countryPart, region: null, city: remoteRest ? null : rest, remote: remoteRest, confidence: "high" as Confidence, display: "" };
    return { ...loc, display: buildDisplay(loc) };
  }

  // "CC - City" prefix pattern (e.g. "IN - Bengaluru", "MX- Mexico City", "CA - San Francisco")
  const ccPrefixMatch = s.match(/^([A-Z]{2})\s*[-–]\s*(.+)$/i);
  if (ccPrefixMatch) {
    const parsedCC = ccPrefixMatch[1].toUpperCase();
    const city = ccPrefixMatch[2].trim();
    // If city is a known non-US city, the prefix must be a country code (not a US state)
    // e.g. "IN - Bengaluru" → India, not Indiana
    if (US_STATE_ABBRS.has(parsedCC) && !isKnownNonUS(city)) {
      // e.g. "CA - San Francisco" — state prefix, treat as US
      const loc = { raw: s, country: "US", region: parsedCC, city, remote: false, confidence: "high" as Confidence, display: "" };
      return { ...loc, display: buildDisplay(loc) };
    }
    const parsedIsUS = parsedCC === "US";
    const loc = {
      raw: s, country: parsedIsUS ? "US" : parsedCC,
      region: null, city, remote: false, confidence: "high" as Confidence, display: "",
    };
    return { ...loc, display: buildDisplay(loc) };
  }

  // "City, ST" e.g. "San Francisco, CA" or "San Francisco, CA 94103"
  const parts = s.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].toUpperCase().split(/\s+/)[0];
    if (US_STATE_ABBRS.has(lastPart)) {
      const city = parts.slice(0, parts.length - 1).join(", ");
      const loc = { raw: s, country: "US", region: lastPart, city, remote: false, confidence: "high" as Confidence, display: "" };
      return { ...loc, display: buildDisplay(loc) };
    }
    // Full state name e.g. "San Francisco, California"
    const lastLower = parts[parts.length - 1].toLowerCase();
    if (US_STATE_NAMES.has(lastLower)) {
      const city = parts.slice(0, parts.length - 1).join(", ");
      const region = Object.entries(US_STATES).find(([, v]) => v.toLowerCase() === lastLower)?.[0] ?? null;
      const loc = { raw: s, country: "US", region, city, remote: false, confidence: "high" as Confidence, display: "" };
      return { ...loc, display: buildDisplay(loc) };
    }
  }

  // "City, Country" e.g. "London, UK" or "São Paulo, Brazil"
  if (parts.length >= 2) {
    const countryPart = parts[parts.length - 1].toUpperCase();
    const isUS = ["US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA"].includes(countryPart);
    if (isUS) {
      const city = parts.slice(0, parts.length - 1).join(", ");
      const loc = { raw: s, country: "US", region: null, city, remote: false, confidence: "high" as Confidence, display: "" };
      return { ...loc, display: buildDisplay(loc) };
    }
    // Explicitly non-US (has a non-US country suffix)
    const loc = { raw: s, country: parts[parts.length - 1], region: null, city: parts[0], remote: false, confidence: "high" as Confidence, display: "" };
    return { ...loc, display: buildDisplay(loc) };
  }

  // City only — check known non-US list before defaulting to include
  if (isKnownNonUS(s)) {
    const loc = { raw: s, country: s, region: null, city: s, remote: false, confidence: "high" as Confidence, display: "" };
    return { ...loc, display: buildDisplay(loc) };
  }

  const loc = { raw: s, country: null, region: null, city: s, remote: false, confidence: "low" as Confidence, display: "" };
  return { ...loc, display: buildDisplay(loc) };
}

// Strategy 1: Ashby — "CC - City" format or "Remote"
export function parseAshbyLocation(
  raw: string | null | undefined,
  countryCode: string | null | undefined,
): ParsedLocation {
  const nullResult: ParsedLocation = {
    raw: null, country: null, region: null, city: null, remote: false, confidence: "none", display: "-",
  };

  if (!raw && !countryCode) return nullResult;

  const s = (raw ?? "").trim();
  const lower = s.toLowerCase();
  const isRemote = lower.includes("remote");

  const cc = (countryCode ?? "").trim().toUpperCase();
  const isUS = cc === "US" || cc === "USA" || cc === "UNITED STATES" || cc === "UNITED STATES OF AMERICA";
  const isNonUS = cc !== "" && !isUS;

  if (isRemote) {
    if (isUS) {
      const loc = { raw: s || null, country: "US", region: null, city: null, remote: true, confidence: "high" as Confidence, display: "" };
      return { ...loc, display: buildDisplay(loc) };
    }
    if (isNonUS) {
      const loc = { raw: s || null, country: cc, region: null, city: null, remote: true, confidence: "high" as Confidence, display: "" };
      return { ...loc, display: buildDisplay(loc) };
    }
    const loc = { raw: s || null, country: null, region: null, city: null, remote: true, confidence: "low" as Confidence, display: "" };
    return { ...loc, display: buildDisplay(loc) };
  }

  // Parse "CC - City" format
  const ccCityMatch = s.match(/^([A-Z]{2})\s*[-–]\s*(.+)$/i);
  if (ccCityMatch) {
    const parsedCC = ccCityMatch[1].toUpperCase();
    const city = ccCityMatch[2].trim();
    const parsedIsUS = parsedCC === "US";
    const loc = {
      raw: s, country: parsedIsUS ? "US" : parsedCC,
      region: null, city, remote: false, confidence: "high" as Confidence, display: "",
    };
    return { ...loc, display: buildDisplay(loc) };
  }

  // Fall back to countryCode field
  if (isUS) {
    // Parse "City, State" format within Ashby when country is known
    const commaParts = s.split(",").map((p) => p.trim());
    if (commaParts.length >= 2) {
      const stateToken = commaParts[commaParts.length - 1].toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
      const region = US_STATE_ABBRS.has(stateToken) ? stateToken : null;
      const city = commaParts.slice(0, region ? commaParts.length - 1 : commaParts.length).join(", ");
      const loc = { raw: s, country: "US", region, city, remote: false, confidence: "high" as Confidence, display: "" };
      return { ...loc, display: buildDisplay(loc) };
    }
    const loc = { raw: s || null, country: "US", region: null, city: s || null, remote: false, confidence: "medium" as Confidence, display: "" };
    return { ...loc, display: buildDisplay(loc) };
  }
  if (isNonUS) {
    const loc = { raw: s || null, country: cc, region: null, city: s || null, remote: false, confidence: "medium" as Confidence, display: "" };
    return { ...loc, display: buildDisplay(loc) };
  }

  if (!s) return nullResult;
  if (isKnownNonUS(s)) {
    const loc = { raw: s, country: s, region: null, city: s, remote: false, confidence: "high" as Confidence, display: "" };
    return { ...loc, display: buildDisplay(loc) };
  }
  const loc = { raw: s, country: null, region: null, city: s, remote: false, confidence: "low" as Confidence, display: "" };
  return { ...loc, display: buildDisplay(loc) };
}

// Strategy 1: SmartRecruiters — has location.country as ISO 3166-1 alpha-2
export function parseSmartRecruitersLocation(
  city: string | null | undefined,
  region: string | null | undefined,
  country: string | null | undefined,
  remote: boolean,
): ParsedLocation {
  const cc = (country ?? "").toUpperCase();
  const isUS = cc === "US" || cc === "USA";

  if (!city && !region && !country) {
    return { raw: null, country: null, region: null, city: null, remote, confidence: "none", display: "-" };
  }

  const conf: Confidence = country ? "high" : region ? "medium" : "low";
  const loc = {
    raw: [city, region, country].filter(Boolean).join(", ") || null,
    country: isUS ? "US" : (cc || null),
    region: region ?? null,
    city: city ?? null,
    remote,
    confidence: conf,
    display: "",
  };
  return { ...loc, display: buildDisplay(loc) };
}

export function isUSJob(loc: ParsedLocation): boolean {
  // Confirmed non-US country → exclude
  if (loc.country !== null && loc.country !== "US") return false;
  // Ambiguous remote with no country info → exclude
  if (loc.remote && loc.confidence === "low") return false;
  // Confirmed US, or city-only where we couldn't determine country → include
  return true;
}
