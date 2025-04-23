// src/app/api/record/log/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/authOptions";
import { getRecordingJobInfo } from "@/utils/resolverUtils";

export async function GET(req: Request) {
    // auth boilerplate…
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = new URL(req.url).searchParams.get("recordingId");
    if (!id) return NextResponse.json({ error: "Missing recordingId" }, { status: 400 });

    try {
        const info = await getRecordingJobInfo(id);
        return NextResponse.json({ log: info.logs.join("\n") });
    } catch (err) {
        console.warn("Failed to load logs for", id, err);
        return NextResponse.json({ log: "(log unavailable)" });
    }
}
