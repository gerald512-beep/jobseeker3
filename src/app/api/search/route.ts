import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TITLE_PHRASES, fetchAdzunaPage, normalizeAndFilter, jobToDbRow } from "@/lib/adzuna";

const PER_PAGE = 20;

export async function GET(req: NextRequest) {
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const where = req.nextUrl.searchParams.get("where") ?? "";

  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    return NextResponse.json(
      { jobs: [], total: 0, error: "ADZUNA_APP_ID and ADZUNA_APP_KEY not set in .env" },
      { status: 500 },
    );
  }

  // 3 parallel calls — one per title phrase, last 2 days only
  const callResults = await Promise.all(
    TITLE_PHRASES.map((phrase) =>
      fetchAdzunaPage(appId, appKey, phrase, 1, { maxDaysOld: 2, where }),
    ),
  );

  const seen = new Set<string>();
  const combined = normalizeAndFilter(callResults.flat(), seen).sort((a, b) =>
    (b.postedAt ?? "").localeCompare(a.postedAt ?? ""),
  );

  const total = combined.length;
  const offset = (page - 1) * PER_PAGE;
  const normalized = combined.slice(offset, offset + PER_PAGE);

  if (normalized.length === 0) return NextResponse.json({ jobs: [], total });

  // Detect which are new vs already seen in baseline or prior fetches
  const existing = await prisma.job.findMany({
    where: { id: { in: normalized.map((j) => j.id) } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((j) => j.id));

  const newOnes = normalized.filter((j) => !existingIds.has(j.id));
  if (newOnes.length > 0) {
    await prisma.job.createMany({
      data: newOnes.map((j) => jobToDbRow(j, { isNew: true })),
    });
  }

  const jobs = normalized.map((j) => ({ ...j, isNew: !existingIds.has(j.id) }));
  return NextResponse.json({ jobs, total });
}
