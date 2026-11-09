import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { localDate } from "@/lib/scanner/daily";

// Daily record for a tracked board (default: the Adobe tracker) plus the jobs posted in the window.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const slug = sp.get("slug") ?? "adobe";
  const category = sp.get("category") ?? "adobe";
  const parsedDays = parseInt(sp.get("days") ?? "30", 10);
  const days = Number.isFinite(parsedDays) ? Math.min(Math.max(parsedDays, 1), 365) : 30;

  // Contiguous local dates, newest first, so days with no postings still show up as 0
  const dates: string[] = [];
  const cursor = new Date();
  for (let i = 0; i < days; i++) {
    dates.push(localDate(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  const oldest = dates[dates.length - 1];

  const [stats, jobs, open, lastScan] = await Promise.all([
    prisma.dailyStat.findMany({ where: { slug, category, date: { gte: oldest } } }),
    prisma.job.findMany({
      where: { slug, category, createdAt: { gte: oldest } },
      orderBy: [{ createdAt: "desc" }, { title: "asc" }],
      select: { id: true, title: true, location: true, url: true, department: true, createdAt: true, isActive: true, isNew: true },
    }),
    prisma.job.count({ where: { slug, category, isActive: true } }),
    prisma.dailyStat.findFirst({
      where: { slug, category, scannedAt: { not: null } },
      orderBy: { scannedAt: "desc" },
      select: { scannedAt: true },
    }),
  ]);

  const byDate = new Map(stats.map((s) => [s.date, s]));
  const rows = dates.map((date) => {
    const s = byDate.get(date);
    return {
      date,
      posted: s?.posted ?? 0,
      discovered: s?.scannedAt ? s.discovered : null,
      active: s?.active ?? null,
    };
  });

  return NextResponse.json({ slug, category, days, today: dates[0], rows, jobs, open, lastScanAt: lastScan?.scannedAt ?? null });
}
