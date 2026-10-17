const CX_INCLUDE = [
  "customer success manager",
  "customer success operations",
  "customer experience",
  "cx manager",
  "cx strategy",
  "cx operations",
  "cx ops",
  "support operations",
  "service operations",
  "customer enablement",
  "onboarding manager",
  "renewals manager",
  "voice of customer",
  "customer insights",
  "implementation manager",
  "customer operations",
  "customer journey",
  "cxi",
  "product manager",
  "product management",
  "program manager",
  "program management",
];

const CX_EXCLUDE = [
  "technical program management",
  "technical program manager",
  "actimize",
];

export function matchesCXKeywords(title: string, department?: string | null): boolean {
  const text = `${title} ${department ?? ""}`.toLowerCase();
  if (CX_EXCLUDE.some((kw) => text.includes(kw))) return false;
  return CX_INCLUDE.some((kw) => text.includes(kw));
}
