const INCLUDE = [
  "strategy and operations",
  "strategy & operations",
  "strategy and ops",
  "strategy & ops",
  "strategy and bizops",
  "strategy & bizops",
  "strategy operations",
  "strategy ops",
  "strategy and planning",
  "strategy & planning",
  "bizops",
  "biz ops",
  "business ops",
  "business operations",
  "operations manager",
  "operations lead",
  "operations associate",
  "operations analyst",
  "operations specialist",
  "marketplace operations",
  "product operations",
  "revenue operations",
  "growth operations",
  "sales operations",
  "customer operations",
  "launch operations",
  "fleet operations",
  "logistics operations",
  "s&o",
  "gtm program manager",
  "operations program manager",
  "strategy program manager",
];

import { matchesCXKeywords } from "./cx-keywords";
import type { Category } from "@/types";

const EXCLUDE = ["actimize"];

function matchesSOKeywords(title: string, department?: string | null): boolean {
  const text = `${title} ${department ?? ""}`.toLowerCase();
  if (EXCLUDE.some((kw) => text.includes(kw))) return false;
  return INCLUDE.some((kw) => text.includes(kw));
}

export function matchesKeywords(title: string, department: string | null | undefined, category: Category): boolean {
  return category === "cx" ? matchesCXKeywords(title, department) : matchesSOKeywords(title, department);
}
