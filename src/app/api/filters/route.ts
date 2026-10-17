import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { COMPANIES } from "@/lib/scanner/companies";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") ?? "so";

  const [regions, cities] = await Promise.all([
    prisma.job.findMany({ where: { category }, select: { region: true }, distinct: ["region"] }),
    prisma.job.findMany({ where: { category }, select: { city: true }, distinct: ["city"] }),
  ]);

  return NextResponse.json({
    companies: COMPANIES.filter((c) => c.category === category).map((c) => ({ value: c.slug, label: c.label })),
    regions: (regions as { region: string | null }[]).map((r) => r.region).filter(Boolean).sort(),
    cities:  (cities  as { city:   string | null }[]).map((r) => r.city).filter(Boolean).sort(),
  });
}
