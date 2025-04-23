// src/app/api/record/status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/authOptions";
import { getRecordingJobInfo } from "@/utils/resolverUtils";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recordingId = new URL(req.url).searchParams.get("recordingId");
    if (!recordingId) {
        return NextResponse.json({ error: "Missing recordingId" }, { status: 400 });
    }

    try {
        const info = await getRecordingJobInfo(recordingId);

        // 1) flatten any arrays to their last value
        const flatStatus: Record<string, string> = {};
        for (const [k, v] of Object.entries(info.status)) {
            flatStatus[k] = Array.isArray(v) ? v[v.length - 1] : v;
        }

        // 2) preserve your 404-on-unknown + ERROR logic
        if (flatStatus.STATUS === "unknown" && flatStatus.ERROR) {
            return NextResponse.json(flatStatus, { status: 404 });
        }

        // 3) return a pure Record<string,string>
        return NextResponse.json(flatStatus);
    } catch (err) {
        console.warn("❌ Failed to get status for", recordingId, err);
        return NextResponse.json({ STATUS: "unknown", ERROR: "Status unavailable" }, { status: 404 });
    }
}
