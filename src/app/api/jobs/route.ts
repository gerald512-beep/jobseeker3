import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const category = searchParams.get("category") ?? "so";
  const company  = searchParams.get("company")  ?? "";
  const country  = searchParams.get("country")  ?? "";
  const region   = searchParams.get("region")   ?? "";
  const city     = searchParams.get("city")     ?? "";
  const title    = searchParams.get("title")    ?? "";
  const onlyNew  = searchParams.get("onlyNew") === "1";
  const daysAgoParam = searchParams.get("daysAgo");
  const daysAgo = daysAgoParam !== null ? parseInt(daysAgoParam, 10) : null;

  const jobs = await prisma.job.findMany({
    where: {
      category,
      isActive: true,
      ...(company ? { slug: company } : {}),
      ...(country ? { country } : {}),
      ...(region  ? { region:  { contains: region  } } : {}),
      ...(city    ? { city:    { contains: city    } } : {}),
      ...(title   ? { title:   { contains: title   } } : {}),
      ...(onlyNew ? { isNew: true } : {}),
    },
    orderBy: { firstSeenAt: "desc" },
  });

  const cutoffStr = daysAgo !== null
    ? (() => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toISOString().split("T")[0]; })()
    : null;

  const filtered = cutoffStr
    ? (jobs as { createdAt: string | null; [key: string]: unknown }[]).filter((job) =>
        job.createdAt ? job.createdAt >= cutoffStr : false
      )
    : jobs;

  return NextResponse.json({ jobs: filtered, total: filtered.length });
}
