
// src/app/api/record/schedule-org/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/authOptions";
import { ScheduleResolver } from "@/resolvers/ScheduleResolver";

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

    const status = await ScheduleResolver.stopRecording(recordingId);
    if (!status.success) {
        return NextResponse.json({ error: status.error }, { status: 500 });
    }
    console.log("📦 stop-recording response:", status.success, status.message);
    return NextResponse.json(status);
}
