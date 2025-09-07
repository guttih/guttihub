
// src/app/api/record/schedule-org/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ScheduleResolver } from "@/resolvers/ScheduleResolver";

export async function GET(req: Request) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cacheKey = searchParams.get("cacheKey");

    if (!cacheKey) {
        return NextResponse.json({ error: "Missing cacheKey" }, { status: 400 });
    }

    const status = await ScheduleResolver.stopRecording(cacheKey);
    if (!status.success) {
        return NextResponse.json({ error: status.error }, { status: 500 });
    }
    console.log("📦 stop-recording response:", status.success, status.message);
    return NextResponse.json(status);
}
