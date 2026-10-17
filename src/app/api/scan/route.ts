import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runScan } from "@/lib/scanner";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-scan-secret");
  if (secret !== process.env.SCAN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runScan(prisma);
    return NextResponse.json({
      ok: true,
      newJobCount: result.newJobCount,
      totalJobs: result.totalJobs,
      isBaseline: result.isBaseline,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
