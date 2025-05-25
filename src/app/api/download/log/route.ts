// src/app/api/download/log/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/authOptions";
import { XgetDownloadJobInfo } from "@/utils/job/XgetJobInfo";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const recordingId = searchParams.get("recordingId");
    const cacheKey = searchParams.get("cacheKey");
    if (!recordingId) return NextResponse.json({ error: "Missing recordingId" }, { status: 400 });

    try {
        const info = await XgetDownloadJobInfo(cacheKey, recordingId);
        return NextResponse.json({ log: info.logs.join("\n") });
    } catch (err) {
        console.warn("Failed to load download logs for", recordingId, err);
        return NextResponse.json({ log: "(log unavailable)" });
    }
}
