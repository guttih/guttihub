// src/app/api/record/monitor/route.ts

import path from "path";
import { services } from "@/config";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { infoJsonExists, readRecordingJobInfo, readRecordingJobFile } from "@/utils/fileHandler";
import { readJobLogFile, readJobStatusFile } from "@/utils/resolverUtils";
import { getLatestStatus } from "@/utils/statusHelpers";
import { isPidRunningFromStatus } from "@/utils/record/recordingJobUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cacheKey = searchParams.get("cacheKey");
  let recordingId = searchParams.get("recordingId");

  if (!cacheKey && !recordingId) {
    return NextResponse.json({ error: "Missing cacheKey or recordingId" }, { status: 400 });
  }
  try {
    if (cacheKey && !recordingId) {
        const job = await readRecordingJobFile(cacheKey);
        if (!job) {
            return NextResponse.json({ error: "Recording job not found" }, { status: 404 });
        }
        recordingId = job.recordingId;   
    }

        

    // --- Finalized recordings first ---
    if (recordingId && infoJsonExists(recordingId)) {
      const info = await readRecordingJobInfo(recordingId);
      const service = services.find((service) => service.hasFileAccess);
      const relativePath = info.job.finalOutputFile
        ? path.relative(path.resolve("public/videos"), path.resolve(info.job.finalOutputFile)) : "";
      const playbackUrl = service && relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath)
        ? `/api/video/${encodeURIComponent(service.id)}/${relativePath.split(path.sep).map(encodeURIComponent).join("/")}`
        : null;
      return NextResponse.json({
        recordingId,
        cacheKey: info.job.cacheKey,
        user: info.job.user,
        duration: info.job.duration,
        createdAt: info.job.createdAt,
        outputFile: info.job.finalOutputFile,
        playbackUrl,
        currentStatus: getLatestStatus(info.status.STATUS) === "unknown" ? "done" : getLatestStatus(info.status.STATUS),
        statusLines: Object.entries(info.status).map(([key, val]) => `${key}: ${val}`),
        logLines: info.logs,
        serverTime: new Date().toISOString(),
        startedAt: info.status.STARTED_AT ?? null,
        expectedStop: info.status.EXPECTED_STOP ?? null,
      });
    }

    // --- Otherwise live recording ---
    const job = await readRecordingJobFile(cacheKey!);

    const statusLinesRaw = await readJobStatusFile(job.statusFile);
    const logLinesRaw = await readJobLogFile(job.logFile);

    let latestStatus = getLatestStatus(statusLinesRaw.STATUS);

    // 🔥 Detect if FFmpeg is actually dead
    if ((latestStatus === "recording" || latestStatus === "live") && !(await isPidRunningFromStatus(job.statusFile))) {
      console.warn(`🧟 Zombie recording detected for ${job.recordingId}`);
      latestStatus = "error"; // or "dead" or "interrupted"
    }

    return NextResponse.json({
      recordingId: job.recordingId || "(unknown)",
      cacheKey: job.cacheKey,
      user: statusLinesRaw.USER || "(unknown)",
      duration: Number(statusLinesRaw.DURATION) || null,
      createdAt: statusLinesRaw.STARTED_AT || null,
      outputFile: statusLinesRaw.HLS_PLAYLIST
        ? getLatestStatus(statusLinesRaw.HLS_PLAYLIST)
        : statusLinesRaw.TS_FILE ? getLatestStatus(statusLinesRaw.TS_FILE) : null,
      playbackUrl: null,
      currentStatus: latestStatus,
      statusLines: Object.entries(statusLinesRaw).map(([key, val]) => `${key}: ${val}`),
      logLines: logLinesRaw,
      serverTime: new Date().toISOString(),
      startedAt: statusLinesRaw.STARTED_AT ?? null,
      expectedStop: statusLinesRaw.EXPECTED_STOP ?? null,
    });
  } catch (err) {
    console.error("❌ Failed to monitor recording:", err);
    return NextResponse.json({ error: "Failed to monitor recording" }, { status: 500 });
  }
}
