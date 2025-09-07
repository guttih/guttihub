// src/app/api/record/log/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRecordingJobInfo } from "@/utils/resolverUtils";

export async function GET(req: Request) {
    // auth boilerplate…
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const recordingId = new URL(req.url).searchParams.get("recordingId");
    const cacheKey = new URL(req.url).searchParams.get("cacheKey");
    if (!recordingId) return NextResponse.json({ error: "Missing recordingId" }, { status: 400 });

    try {
        const info = await getRecordingJobInfo(cacheKey, recordingId);
        return NextResponse.json({ log: info.logs.join("\n") });
    } catch (err) {
        console.warn("Failed to load logs for", recordingId, err);
        return NextResponse.json({ log: "(log unavailable)" });
    }
}
