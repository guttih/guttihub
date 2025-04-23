// src/app/api/record/job/route.ts
import { NextRequest, NextResponse } from "next/server";
import {  readRecordingJobFile } from "@/utils/fileHandler";
import { getRecordingIdByCacheKey } from "@/utils/resolverUtils";

export async function GET(req: NextRequest) {
    const cacheKey = req.nextUrl.searchParams.get("cacheKey");
    const recordingId = req.nextUrl.searchParams.get("recordingId");

    if (!cacheKey && !recordingId) {
        return NextResponse.json({ error: "Missing cacheKey or recordingId" }, { status: 400 });
    }

    try {
        if (recordingId) {
            const job = await readRecordingJobFile(recordingId);
            if (job) {
                return NextResponse.json(job);
            }
        }
        if (cacheKey) {
            const recordingId = await getRecordingIdByCacheKey(cacheKey);
            if (recordingId) {
                const job = readRecordingJobFile(recordingId);
                if (job) {
                    return NextResponse.json(job);
                }
            }
        }
        return NextResponse.json({ error: "Recording job not found" }, { status: 404 });
    } catch {
        return NextResponse.json({ error: "Recording job not found" }, { status: 404 });
    }
}
