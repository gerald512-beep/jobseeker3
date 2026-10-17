export type Source = "greenhouse" | "ashby" | "smartrecruiters" | "waymo" | "ebay" | "uber" | "medallia" | "qualtrics" | "glassbox" | "workday" | "teamtailor" | "lever" | "adobe";
export type Confidence = "high" | "medium" | "low" | "none";
export type Category = "so" | "cx";

export interface Company {
  slug: string;
  label: string;
  source: Source;
  category: Category;
  wdInstance?: string; // Workday only: "wd1", "wd5", etc. Defaults to "wd1"
  wdBoard?: string;    // Workday only: board path if different from slug
  ttDomain?: string;   // Teamtailor only: e.g. "careers.moove.io"
}

export interface ParsedLocation {
  raw: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  remote: boolean;
  confidence: Confidence;
  display: string;
}

export interface ScannedJob {
  id: string;
  source: Source;
  slug: string;
  label: string;
  title: string;
  location: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  remote: boolean;
  locationConfidence: Confidence;
  url: string;
  department: string | null;
  createdAt: string | null;
  category: Category;
}
