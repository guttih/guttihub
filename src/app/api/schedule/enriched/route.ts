// src/app/api/schedule/enriched/route.ts

import { NextResponse } from "next/server";
import { expandAllJobs } from "@/utils/JobctlMetaExpander";

/* ---------- list enriched jobs ----------------------------------- */

export async function GET() {
  try {
    const enrichedJobs = await expandAllJobs();
    return NextResponse.json({ ok: true, enrichedJobs });
  } catch (err) {
    console.error("❌ Failed to expand jobs:", err);
    return NextResponse.json({ ok: false, enrichedJobs: [], error: "Failed to enrich scheduled jobs" }, { status: 500 });
  }
}
