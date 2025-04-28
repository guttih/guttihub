// src/app/api/live/active/route.ts

import { NextResponse } from "next/server";
import { getActiveLiveJobs, readCashedEntryFile} from "@/utils/record/recordingJobUtils";
import { readStatusFile } from "@/utils/fileHandler";
import { RecordingJob } from "@/types/RecordingJob";
import { StreamingServiceResolver } from "@/resolvers/StreamingServiceResolver";
import { isProcessAlive } from "@/utils/process";

export async function GET() {
  try {
    const jobs = await getActiveLiveJobs();
    const resolver = new StreamingServiceResolver();

    const enriched = await Promise.all(
      jobs.map(async (job: RecordingJob) => {
        const entry = await readCashedEntryFile(job.cacheKey);
        const status = await readStatusFile(job.statusFile);

        let pid = null;
        if (status?.PID) {
          pid = parseInt(status.PID, 10);
        }

        const alive = pid ? await isProcessAlive(pid) : false;
        const service = entry ? resolver.findByServer(entry.url) : null;

        let finalStatus = status?.STATUS || "unknown";

        if (finalStatus === "recording" && !alive) {
          console.warn(`🧟 Zombie detected: job ${job.recordingId} is dead but status=recording`);
          finalStatus = "error";
        }

        return {
          recordingId: job.recordingId,
          cacheKey: job.cacheKey,
          format: job.format,
          name: entry?.name ?? "Unknown",
          groupTitle: entry?.groupTitle ?? null,
          startedAt: job.startTime,
          status: finalStatus,
          serviceName: service?.name ?? null,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("❌ Failed to list active live jobs:", err);
    return NextResponse.json({ error: "Could not load live jobs" }, { status: 500 });
  }
}
