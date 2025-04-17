// src/app/api/recording-job/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { getRecordingJobsDir, readJsonFile } from "@/utils/fileHandler";
import { RecordingJob } from "@/types/RecordingJob";

export async function GET(req: NextRequest) {
  const cacheKey = req.nextUrl.searchParams.get("cacheKey");
  const recordingId = req.nextUrl.searchParams.get("recordingId");

  if (!cacheKey && !recordingId) {
    return NextResponse.json({ error: "Missing cacheKey or recordingId" }, { status: 400 });
  }

  const dir = getRecordingJobsDir();
  const files = await fs.readdir(dir);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  for (const file of jsonFiles) {
    const fullPath = path.join(dir, file);
    try {
      const job = await readJsonFile<RecordingJob>(fullPath);

      if (cacheKey && job.cacheKey === cacheKey) {
        return NextResponse.json(job);
      }

      if (recordingId && job.recordingId === recordingId) {
        return NextResponse.json(job);
      }

    } catch (err) {
      console.warn("❌ Failed to read recording job:", fullPath, err);
    }
  }

  return NextResponse.json({ error: "Recording job not found" }, { status: 404 });
}
