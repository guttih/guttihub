// src/app/api/live/active/route.ts

// src/app/api/live/active/route.ts

import { NextResponse } from "next/server";
import { getActiveLiveJobs} from "@/utils/record/recordingJobUtils";
import { readStatusFile } from "@/utils/fileHandler";
import { RecordingJob } from "@/types/RecordingJob";
import { StreamingServiceResolver } from "@/resolvers/StreamingServiceResolver";

export async function GET() {
  try {
    const jobs = await getActiveLiveJobs();
    const resolver = new StreamingServiceResolver();

    const enriched = await Promise.all(
      jobs.map(async (job: RecordingJob) => {
        const server = StreamingServiceResolver.extractServerFromUrl(job.entry.url);
        const service = server ? resolver.findByServer(server) : null;

        // 🧠 Try to fetch the real status from the .status file
        let status = "live"; // default fallback
        try {
          const parsed = await readStatusFile(job.statusFile);
          status = parsed?.STATUS?.toLowerCase() || "live";
        } catch (e) {
          console.warn(`⚠️ Could not parse status file for ${job.cacheKey}`);
        }

        return {
          recordingId: job.recordingId,
          cacheKey: job.cacheKey,
          format: job.format,
          name: job.entry?.name ?? "Unknown",
          groupTitle: job.entry?.groupTitle ?? null,
          startedAt: job.startTime,
          serviceName: service?.name ?? "Unknown Service",
          status,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("❌ Failed to list active live jobs", err);
    return NextResponse.json({ error: "Could not load live jobs" }, { status: 500 });
  }
}
