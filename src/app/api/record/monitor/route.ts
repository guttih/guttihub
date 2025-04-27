// src/app/api/record/monitor/route.ts

import { NextRequest, NextResponse } from "next/server";
import { readRecordingLogFile, readRecordingStatusFile } from "@/utils/resolverUtils";
import { getRecordingJobsDir, readRecordingJobFile, infoJsonExists, readRecordingJobInfo } from "@/utils/fileHandler";
import path from "path";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cacheKey = searchParams.get("cacheKey");
  const recordingId = searchParams.get("recordingId");

  if (!cacheKey && !recordingId) {
    return NextResponse.json({ error: "Missing cacheKey or recordingId" }, { status: 400 });
  }

  try {
    // --- Try to find finalized info first ---
    if (recordingId && infoJsonExists(recordingId)) {
      const info = await readRecordingJobInfo(recordingId);
      return NextResponse.json({
        recordingId,
        cacheKey: info.job.cacheKey,
        user: info.job.user,
        duration: info.job.duration,
        createdAt: info.job.createdAt,
        outputFile: info.job.outputFile,
        currentStatus: "done",
        statusLines: Object.entries(info.status).map(([key, val]) => `${key}: ${val}`),
        logLines: info.logs,
        serverTime: new Date().toISOString(),
        startedAt: info.status.STARTED_AT ?? null,
        expectedStop: info.status.EXPECTED_STOP ?? null,
      });
    }

    // --- Otherwise live monitor from working files ---
    const job = await readRecordingJobFile(cacheKey!);

    const statusLinesRaw = await readRecordingStatusFile(job.statusFile);
    const logLinesRaw = await readRecordingLogFile(job.logFile);

    const latestStatus = Array.isArray(statusLinesRaw.STATUS)
      ? statusLinesRaw.STATUS[statusLinesRaw.STATUS.length - 1]
      : statusLinesRaw.STATUS ?? "unknown";

    return NextResponse.json({
      recordingId: job.recordingId || "(unknown)",
      cacheKey: job.cacheKey,
      user: statusLinesRaw.USER || "(unknown)",
      duration: Number(statusLinesRaw.DURATION) || null,
      createdAt: statusLinesRaw.STARTED_AT || null,
      outputFile: statusLinesRaw.HLS_PLAYLIST || null,
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
