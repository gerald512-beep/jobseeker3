import type { Company } from "@/types";

export const COMPANIES: Company[] = [
  // S&O — Greenhouse
  { slug: "gleanwork",  label: "Glean",      source: "greenhouse", category: "so" },
  { slug: "instacart",  label: "Instacart",  source: "greenhouse", category: "so" },
  { slug: "braze",      label: "Braze",      source: "greenhouse", category: "so" },
  { slug: "flexport",   label: "Flexport",   source: "greenhouse", category: "so" },
  { slug: "uberfreight",label: "Uber Freight",source: "greenhouse",category: "so" },
  { slug: "lyft",       label: "Lyft",       source: "greenhouse", category: "so" },
  { slug: "stripe",     label: "Stripe",     source: "greenhouse", category: "so" },
  { slug: "samsara",    label: "Samsara",    source: "greenhouse", category: "so" },
  { slug: "gomotive",   label: "Motive",     source: "greenhouse", category: "so" },
  { slug: "fleetio",    label: "Fleetio",    source: "greenhouse", category: "so" },
  { slug: "faire",      label: "Faire",      source: "greenhouse", category: "so" },
  { slug: "vercel",     label: "Vercel",     source: "greenhouse", category: "so" },
  { slug: "cresta",     label: "Cresta",     source: "greenhouse", category: "so" },
  { slug: "dialpad",    label: "Dialpad",    source: "greenhouse", category: "so" },
  { slug: "talkdesk2",  label: "Talkdesk",   source: "greenhouse", category: "so" },
  { slug: "intercom",   label: "Intercom",   source: "greenhouse", category: "so" },
  { slug: "roku",       label: "Roku",       source: "greenhouse", category: "so" },
  { slug: "nice",       label: "NICE",       source: "greenhouse", category: "so" },
  { slug: "doordashusa",label: "DoorDash",   source: "greenhouse", category: "so" },
  { slug: "scaleai",    label: "Scale AI",   source: "greenhouse", category: "so" },
  // S&O — Ashby
  { slug: "airwallex",  label: "Airwallex",  source: "ashby", category: "so" },
  { slug: "plaid",      label: "Plaid",      source: "ashby", category: "so" },
  { slug: "hims-and-hers",label: "Hims & Hers",source: "ashby",category: "so" },
  { slug: "ramp",       label: "Ramp",       source: "ashby", category: "so" },
  { slug: "thumbtack",  label: "Thumbtack",  source: "ashby", category: "so" },
  { slug: "poshmark",   label: "Poshmark",   source: "ashby", category: "so" },
  { slug: "Sierra",     label: "Sierra",     source: "ashby", category: "so" },
  { slug: "solidroad",  label: "Solidroad",  source: "ashby", category: "so" },
  { slug: "avoca",      label: "Avoca",      source: "ashby", category: "so" },
  { slug: "decagon",    label: "Decagon",    source: "ashby", category: "so" },
  { slug: "gigaml",     label: "Giga",       source: "ashby", category: "so" },
  { slug: "Maven-agi",  label: "Maven AGI",  source: "ashby", category: "so" },
  { slug: "bland",      label: "Bland",      source: "ashby", category: "so" },
  { slug: "glia",       label: "Glia",       source: "ashby", category: "so" },
  { slug: "arena",      label: "Arena",      source: "ashby", category: "so" },
  // S&O — Workday
  { slug: "zendesk",   label: "Zendesk",   source: "workday", category: "so", wdInstance: "wd1",  wdBoard: "zendesk" },
  { slug: "verizon",   label: "Verizon",   source: "workday", category: "so", wdInstance: "wd12", wdBoard: "verizon-careers" },
  { slug: "sprinklr",  label: "Sprinklr",  source: "workday", category: "so", wdInstance: "wd1",  wdBoard: "careers" },
  { slug: "visa",      label: "Visa",      source: "workday", category: "so", wdInstance: "wd5",  wdBoard: "Visa" },
  // S&O — SmartRecruiters
  { slug: "ServiceNow", label: "ServiceNow", source: "smartrecruiters", category: "so" },
  // S&O — Teamtailor
  { slug: "moove", label: "Moove", source: "teamtailor", category: "so", ttDomain: "careers.moove.io" },
  // S&O — Lever
  { slug: "payjoy", label: "PayJoy", source: "lever", category: "so" },
  // S&O — Adobe (Phenom)
  { slug: "adobe", label: "Adobe", source: "adobe", category: "so" },
  // S&O — Custom scrapers
  { slug: "waymo", label: "Waymo", source: "waymo", category: "so" },
  { slug: "ebay",  label: "eBay",  source: "ebay",  category: "so" },
  { slug: "uber",  label: "Uber",  source: "uber",  category: "so" },

  // CX — Greenhouse
  { slug: "gleanwork",  label: "Glean",      source: "greenhouse", category: "cx" },
  { slug: "braze",      label: "Braze",      source: "greenhouse", category: "cx" },
  { slug: "roku",       label: "Roku",       source: "greenhouse", category: "cx" },
  { slug: "nice",       label: "NICE",       source: "greenhouse", category: "cx" },
  { slug: "intercom",   label: "Intercom",   source: "greenhouse", category: "cx" },
  { slug: "mixpanel",   label: "Mixpanel",   source: "greenhouse", category: "cx" },
  { slug: "twilio",     label: "Twilio",     source: "greenhouse", category: "cx" },
  { slug: "five9",      label: "Five9",      source: "greenhouse", category: "cx" },
  { slug: "doordashusa",label: "DoorDash",   source: "greenhouse", category: "cx" },
  { slug: "vercel",     label: "Vercel",     source: "greenhouse", category: "cx" },
  { slug: "cresta",     label: "Cresta",     source: "greenhouse", category: "cx" },
  { slug: "dialpad",    label: "Dialpad",    source: "greenhouse", category: "cx" },
  { slug: "talkdesk2",  label: "Talkdesk",   source: "greenhouse", category: "cx" },
  { slug: "glassboxltd",label: "Glassbox",   source: "greenhouse", category: "cx" },
  { slug: "scaleai",    label: "Scale AI",   source: "greenhouse", category: "cx" },
  // CX — Ashby
  { slug: "airwallex",  label: "Airwallex",  source: "ashby", category: "cx" },
  { slug: "plaid",      label: "Plaid",      source: "ashby", category: "cx" },
  { slug: "gorgias",    label: "Gorgias",    source: "ashby", category: "cx" },
  { slug: "gainsight",  label: "Gainsight",  source: "ashby", category: "cx" },
  { slug: "kustomer",   label: "Kustomer",   source: "ashby", category: "cx" },
  { slug: "amplitude",  label: "Amplitude",  source: "ashby", category: "cx" },
  { slug: "Sierra",     label: "Sierra",     source: "ashby", category: "cx" },
  { slug: "solidroad",  label: "Solidroad",  source: "ashby", category: "cx" },
  { slug: "avoca",      label: "Avoca",      source: "ashby", category: "cx" },
  { slug: "decagon",    label: "Decagon",    source: "ashby", category: "cx" },
  { slug: "gigaml",     label: "Giga",       source: "ashby", category: "cx" },
  { slug: "Maven-agi",  label: "Maven AGI",  source: "ashby", category: "cx" },
  { slug: "bland",      label: "Bland",      source: "ashby", category: "cx" },
  { slug: "glia",       label: "Glia",       source: "ashby", category: "cx" },
  { slug: "arena",      label: "Arena",      source: "ashby", category: "cx" },
  // CX — Workday
  { slug: "zendesk",   label: "Zendesk",   source: "workday", category: "cx", wdInstance: "wd1",  wdBoard: "zendesk" },
  { slug: "verizon",   label: "Verizon",   source: "workday", category: "cx", wdInstance: "wd12", wdBoard: "verizon-careers" },
  { slug: "sprinklr",  label: "Sprinklr",  source: "workday", category: "cx", wdInstance: "wd1",  wdBoard: "careers" },
  // CX — Medallia (Jibe/iCIMS)
  { slug: "medallia",  label: "Medallia",  source: "medallia",  category: "cx" },
  // CX — Qualtrics (Phenom People)
  { slug: "qualtrics", label: "Qualtrics", source: "qualtrics", category: "cx" },
  // CX — Lever
  { slug: "payjoy", label: "PayJoy", source: "lever", category: "cx" },
  // CX — Adobe (Phenom)
  { slug: "adobe", label: "Adobe", source: "adobe", category: "cx" },
  // CX — Teamtailor
  { slug: "moove", label: "Moove", source: "teamtailor", category: "cx", ttDomain: "careers.moove.io" },
];
