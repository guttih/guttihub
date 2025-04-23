// src/app/api/live/active/route.ts

import { NextResponse } from "next/server";
import { getActiveLiveJobs, getEntryByCacheKey } from "@/utils/record/recordingJobUtils";
import { RecordingJob } from "@/types/RecordingJob";



export async function GET() {
  try {
    const jobs = await getActiveLiveJobs();

    const enriched = await Promise.all(
      jobs.map(async (job: RecordingJob) => {
            
        const entry = await getEntryByCacheKey(job.cacheKey);
        return {
          recordingId: job.recordingId,
          cacheKey: job.cacheKey,
          format: job.format,
          name: entry?.name ?? "Unknown",
          groupTitle: entry?.groupTitle ?? null,
          startedAt: job.startTime,
          status: "live",
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("❌ Failed to list active live jobs", err);
    return NextResponse.json({ error: "Could not load live jobs" }, { status: 500 });
  }
}
