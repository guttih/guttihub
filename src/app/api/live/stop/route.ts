// src/app/api/live/stop/route.ts

import { NextRequest } from "next/server";
import { readRecordingJobFile, getRecordingJobsDir, deleteFileAndForget } from "@/utils/fileHandler";
import { ScheduleResolver } from "@/resolvers/ScheduleResolver";
import { LiveResolver } from "@/resolvers/LiveResolver";

export async function POST(req: NextRequest) {
    try {
      const { cacheKey } = await req.json();
  
      if (!cacheKey) {
        return new Response(JSON.stringify({ error: "Missing live cacheKey" }), {
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
  
      if (job.format === "hls-live") {
        await LiveResolver.stopStream(cacheKey);  // 🚀 Streaming stop
    } else {
        await ScheduleResolver.stopRecording(cacheKey);  // 📼 Recording stop
    }
  
      const stopResult = await LiveResolver.stopStream(cacheKey);
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
      console.error("❌ Failed to stop live stream:", err);
      return new Response(JSON.stringify({ error: "Server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }