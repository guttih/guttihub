// src/app/api/live/active/route.ts


// src/app/api/live/active/route.ts

import { NextResponse } from "next/server";
import { getActiveLiveJobs, enrichRecordingJob, enrichDownloadJob } from "@/utils/record/recordingJobUtils";
import { getActiveDownloadJobs } from "@/utils/concurrency";

export async function GET() {
  try {
    // 1. Fetch active jobs
    const liveJobs = await getActiveLiveJobs();
    const downloadJobs = await getActiveDownloadJobs();

    // 2. Enrich
    const enrichedLive = await Promise.all(liveJobs.map(enrichRecordingJob));
    const enrichedDownloads = await Promise.all(downloadJobs.map(enrichDownloadJob));

    // 3. Combine
    const combined = [...enrichedLive, ...enrichedDownloads];
    return NextResponse.json(combined);
  } catch (err) {
    console.error("❌ Failed to list active jobs:", err);
    return NextResponse.json({ error: "Could not load live jobs" }, { status: 500 });
  }
}
