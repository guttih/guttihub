// src/app/api/download/monitor/route.ts

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { readDownloadJobFile, readDownloadJobInfo } from "@/utils/fileHandler";
import { infoJsonExists } from "@/utils/fileHandler";
import { readJobLogFile, readJobStatusFile } from "@/utils/resolverUtils";
import { extractLatestDownloadProgressPercent } from "@/utils/downloadStatusParser";

export async function GET(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const cacheKey = searchParams.get("cacheKey");
  const recordingId = searchParams.get("recordingId");

  if (!cacheKey && !recordingId) {
    return NextResponse.json({ error: "Missing cacheKey or recordingId" }, { status: 400 });
  }

  try {
    // 🗃️ Finished downloads
    if (recordingId && infoJsonExists(recordingId)) {
      const info = await readDownloadJobInfo(recordingId);
      return NextResponse.json({
        recordingId,
        cacheKey: info.job.cacheKey,
        user: info.job.user,
        createdAt: info.job.createdAt,
        outputFile: info.job.outputFile,
        currentStatus: "done",
        statusLines: Object.entries(info.status).filter(([key]) => key !== "URL").map(([key, val]) => `${key}: ${val}`.split(info.job.url).join("[stream URL]")),
        logLines: info.logs.map((line) => line.split(info.job.url).join("[stream URL]")),
        serverTime: new Date().toISOString(),
        startedAt: info.status.STARTED_AT ?? null,
      });
    }

    // 🧠 Still live
    const job = await readDownloadJobFile(cacheKey!);
    const statusLinesRaw = await readJobStatusFile(job.statusFile); // reuseable
    const logLinesRaw = await readJobLogFile(job.logFile); // reuseable
    const progressPercent = extractLatestDownloadProgressPercent(logLinesRaw);

    const contentLengthRaw = statusLinesRaw.CONTENT_LENGTH;
    const contentLength = contentLengthRaw && !Array.isArray(contentLengthRaw) ? parseInt(contentLengthRaw, 10) : null;


    const latestStatus = Array.isArray(statusLinesRaw.STATUS)
      ? statusLinesRaw.STATUS[statusLinesRaw.STATUS.length - 1]
      : statusLinesRaw.STATUS ?? "unknown";

    return NextResponse.json({
      recordingId: job.recordingId || "(unknown)",
      cacheKey: job.cacheKey,
      user: statusLinesRaw.USER || "(unknown)",
      createdAt: statusLinesRaw.STARTED_AT || null,
      outputFile: statusLinesRaw.OUTPUT_FILE || null,
      currentStatus: latestStatus,
      statusLines: Object.entries(statusLinesRaw).filter(([key]) => key !== "URL").map(([key, val]) => `${key}: ${val}`.split(job.url).join("[stream URL]")),
      logLines: logLinesRaw.map((line) => line.split(job.url).join("[stream URL]")),
      serverTime: new Date().toISOString(),
      startedAt: statusLinesRaw.STARTED_AT ?? null,
      progressPercent,
      contentLength 
    });
  } catch (err) {
    console.error("❌ Failed to monitor download:", err);
    return NextResponse.json({ error: "Failed to monitor download" }, { status: 500 });
  }
}
