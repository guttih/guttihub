// src/app/api/record/schedule-org/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/authOptions";
import { readJsonFile, getCacheDir, deleteFileAndForget } from "@/utils/fileHandler";
import { ScheduleResolver } from "@/resolvers/ScheduleResolver";
import { M3UEntry } from "@/types/M3UEntry";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    const form = await req.formData();
    const cacheKey = form.get("cacheKey") as string;
    const startTime = form.get("startTime") as string;
    const duration = form.get("duration") as string;
    const recordNow = form.get("recordNow") as string === "true";
    // const baseUrl = form.get("baseUrl") as string;

    if (!cacheKey || !duration  || (!recordNow && !startTime)) {
        console.warn("❌ Missing form values:", { cacheKey, duration, recordNow, startTime });
        return NextResponse.json({ error: "Missing form values" }, { status: 400 });
    }
    
    // Load the cached entry from disk
    const entryPath = `${getCacheDir()}/${cacheKey}.json`;
    let entry: M3UEntry;
    try {
        
        entry = await readJsonFile<M3UEntry>(entryPath);

    } catch (err) {
        console.error("❌ Could not load cached entry:", err);
        return NextResponse.json({ error: "Invalid or expired cache key" }, { status: 404 });
    }


    // const recordingId = buildRecordingId("recording-", new Date(), entry.url, "mp4");
    // const outputFile = `${location}/${recordingId}`;
    // // 🧠 Delegate to resolver
    // //recordingId we get from the old casche file
    // const oldDiskContent = await readRecordingJobFile(entryPath);
    const result = await ScheduleResolver.scheduleRecording({
        cacheKey,
        startTime: recordNow ? new Date().toISOString() : new Date(startTime).toISOString(),
        durationSec: parseInt(duration, 10),
        user: session.user?.email ?? "unknown",
        recordNow: form.get("recordNow") === "true",
        entry: entry
        
    });
    
    if (result.success){
        deleteFileAndForget(entryPath);
    }
    console.log("📦 schedule-recording response:", JSON.stringify(result, null, 4));
    return result.success 
        ? NextResponse.json({ message: result.message, cacheKey : result.cacheKey , recordingId: result.recordingId }, { status: 200 }) 
        : NextResponse.json({ error: result.error }, { status: 500 });
}
