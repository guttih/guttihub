// src/app/api/schedule-recording/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/authOptions";
import { readJsonFile, getCacheDir } from "@/utils/fileHandler";
import { ScheduleResolver } from "@/resolvers/ScheduleResolver";
import { M3UEntry } from "@/types/M3UEntry";
import { buildOutputFileName } from "@/utils/recording/buildOutputFileName";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const cacheKey = form.get("cacheKey") as string;
    const startTime = form.get("startTime") as string;
    const duration = form.get("duration") as string;
    const location = form.get("location") as string;
    const recordNow = form.get("recordNow") === "true";

    if (!cacheKey || !duration || !location || (!recordNow && !startTime)) {
        return NextResponse.json({ error: "Missing form values" }, { status: 400 });
    }

    // ✅ Load the cached entry from disk
    let entry: M3UEntry;
    try {
        const entryPath = `${getCacheDir()}/${cacheKey}.json`;
        entry = await readJsonFile<M3UEntry>(entryPath);
    } catch (err) {
        console.error("❌ Could not load cached entry:", err);
        return NextResponse.json({ error: "Invalid or expired cache key" }, { status: 404 });
    }

    const outputFile = buildOutputFileName(entry, location);
    // 🧠 Delegate to resolver
    const result = await ScheduleResolver.scheduleRecording({
        entry,
        startTime,
        durationSec: parseInt(duration, 10) * 60,
        user: session.user?.email ?? "unknown",
        outputFile,
        recordNow: form.get("recordNow") === "true",
    });

    return result.success ? NextResponse.json({ message: result.message }) : NextResponse.json({ error: result.error }, { status: 500 });
}
