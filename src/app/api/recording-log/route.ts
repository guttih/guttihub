// src/app/api/recording-log/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/authOptions";
import { readFile, readRecordingJobFile } from "@/utils/fileHandler";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const recordingId = searchParams.get("recordingId");

  if (!recordingId) {
    return NextResponse.json({ error: "Missing recordingId" }, { status: 400 });
  }

  try {
    console.log("🔍 Searching for recording job:", recordingId);
    const job = await readRecordingJobFile(recordingId);
    if (!job) {
      console.warn("❌ Recording job not found:", recordingId);
      return NextResponse.json({ error: "Recording job not found" }, { status: 404 });
    }

    const log = await readFile(job.logFile);

    if (!log) {
      console.warn("❌ Log file not found for:", recordingId);
      return NextResponse.json({ log: "(log unavailable)" });
    }
    console.log("🔍 Found log file:", job.logFile);
    return NextResponse.json({ log });
  } catch (err) {
    console.warn("❌ Failed to load log file for:", recordingId, err);
    return NextResponse.json({ log: "(log unavailable)" });
  }
}
