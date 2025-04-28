// src/app/api/live/stop/route.ts

import { NextRequest } from "next/server";
import { readRecordingJobFile } from "@/utils/fileHandler";
import { ScheduleResolver } from "@/resolvers/ScheduleResolver";
import { LiveResolver } from "@/resolvers/LiveResolver";
import { DownloadResolver } from "@/resolvers/DownloadResolver"; 

export async function POST(req: NextRequest) {
  try {
    const { cacheKey } = await req.json();

    if (!cacheKey) {
      return new Response(JSON.stringify({ error: "Missing cacheKey" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const job = await readRecordingJobFile(cacheKey);
    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    let stopResult;

    if (job.format === "hls-live") {
      stopResult = await LiveResolver.stopStream(cacheKey); // 🔵 Streaming
    } else if (job.format === "recording") {
      stopResult = await ScheduleResolver.stopRecording(cacheKey); // 🟠 Recording
    } else if (job.format === "download") {
      stopResult = await DownloadResolver.stopDownload(cacheKey); // 🟢 Downloading
    } else {
      return new Response(JSON.stringify({ error: "Unsupported job format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!stopResult.success) {
      return new Response(JSON.stringify({ error: stopResult.error || "Unknown stop error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Failed to stop job:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
