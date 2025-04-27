// src/app/api/record/job/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readRecordingJobFile } from "@/utils/fileHandler";

export async function GET(req: NextRequest) {
    const cacheKey = req.nextUrl.searchParams.get("cacheKey");
    if (!cacheKey) {
        return NextResponse.json({ error: "Missing cacheKey" }, { status: 400 });
    }

    try {
        if (cacheKey) {
            const job = await readRecordingJobFile(cacheKey);
            if (job) {
                return NextResponse.json(job);
            }
        }
        return NextResponse.json({ error: "Recording job not found" }, { status: 404 });
    } catch {
        return NextResponse.json({ error: "Recording job not found" }, { status: 404 });
    }
}
