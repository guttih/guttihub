// src/app/api/live/active/route.ts


import { NextResponse } from "next/server";
import { getActiveLiveJobs, readCashedEntryFile } from "@/utils/record/recordingJobUtils";
import { getActiveDownloadJobs } from "@/utils/concurrency";
import { readStatusFile, readDownloadJobFile } from "@/utils/fileHandler";
import { RecordingJob } from "@/types/RecordingJob";
import { StreamingServiceResolver } from "@/resolvers/StreamingServiceResolver";
import { isProcessAlive } from "@/utils/process";
import { mapDownloadJobToRecordingJob } from "@/utils/resolverUtils"; // NEW!

export async function GET() {
  try {
    const jobs = await getActiveLiveJobs();
    const downloads = await getActiveDownloadJobs();
    const resolver = new StreamingServiceResolver();

    const enrichedLive = await Promise.all(
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
          name: entry?.name ?? "Unknown Stream",
          groupTitle: entry?.groupTitle ?? "Unknown Group",
          startedAt: job.startTime,
          status: finalStatus,
          serviceName: service?.name ?? "Unknown Service",
          tvgLogo: entry?.tvgLogo ?? "/fallback.png",
        };
      })
    );

    const enrichedDownloads = await Promise.all(
        downloads.map(async (download) => {
          const cacheKey = download.OUTPUT_FILE
            ? download.OUTPUT_FILE.split("/").pop()?.replace(".mp4.part", "") || "unknown-download"
            : "unknown-download";
      
          try {
            const downloadJob = await readDownloadJobFile(cacheKey);
      
            if (!downloadJob || !downloadJob.entry) {
              console.warn(`⚠️ Incomplete download job for ${cacheKey}, using fallback`);
              throw new Error("Incomplete download job");
            }
      
            return mapDownloadJobToRecordingJob(downloadJob); // ✨ todo, add the DownloadStatus
          } catch (err) {
            console.warn(`⚠️ Failed to read DownloadJob file for ${cacheKey}`, err);
      
            return {
              recordingId: `download-${Date.now()}`,
              cacheKey: cacheKey,
              format: "download",
              name: cacheKey,
              groupTitle: "Download",
              startedAt: download.STARTED_AT ?? new Date().toISOString(),
              status: download.STATUS ?? "unknown",
              serviceName: "Download Manager",
              tvgLogo: "/download-icon.png",
            };
          }
        })
      );
      

    const combined = [...enrichedLive, ...enrichedDownloads];

    return NextResponse.json(combined);
  } catch (err) {
    console.error("❌ Failed to list active jobs:", err);
    return NextResponse.json({ error: "Could not load live jobs" }, { status: 500 });
  }
}
