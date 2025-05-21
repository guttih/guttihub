// src/app/api/live/active/route.ts

import { NextResponse } from "next/server";
import { getActiveLiveJobs, enrichJob } from "@/utils/record/recordingJobUtils";

// import { cleanupFinishedJobs } from "@/utils/resolverUtils";

// // Throttle cleanup every 50 minutes
// let lastCleanup = 0;
// const CLEANUP_INTERVAL_MS = 50 *  60 * 1000;

export async function GET() {
    // 🧼 Run cleanup if enough time has passed
    //   const now = Date.now();
    //   if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    //     lastCleanup = now;
    //     cleanupFinishedJobs().catch((err) =>
    //       console.warn("🧼 Cleanup failed:", err)
    //     );
    //   }

    try {
        // 1. Fetch active jobs
        const liveJobs = await getActiveLiveJobs();
        // const downloadJobs = await getActiveDownloadJobs();
        // const downloadJobsStatus = await getActiveDownloadJobsStatuses(downloadJobs);

        // // 2. Enrich

        const enrichedJobs = await Promise.all(liveJobs.map(enrichJob));

        // const enrichedLive = await Promise.all(liveJobs.map(enrichRecordingJob));
        // const enrichedDownloads = await Promise.all(downloadJobsStatus.map(enrichDownloadJob));

        // 3. Combine
        // const combined = [...enrichedLive, ...enrichedDownloads];
        // const uniqueJobs = Array.from(new Map(combined.map((job) => [job.cacheKey, job])).values());
        return NextResponse.json(enrichedJobs);
    } catch (err) {
        console.error("❌ Failed to list active jobs:", err);
        return NextResponse.json({ error: "Could not load live jobs" }, { status: 500 });
    }
}
