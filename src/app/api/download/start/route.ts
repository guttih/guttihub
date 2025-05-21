// src/app/api/download/start/route.ts

import { NextResponse } from "next/server";
import { DownloadResolver } from "@/resolvers/DownloadResolver";
import { M3UEntry } from "@/types/M3UEntry";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const cacheKey: string = body.cacheKey;
        const entry: M3UEntry = body.entry;
        const user = body.user ?? "unknown";
        if (!entry || !entry.url || !cacheKey) {
            return NextResponse.json({ error: "Invalid download start request" }, { status: 400 });
        }

        const result = await DownloadResolver.startDownload({ cacheKey, entry, user });

        if (!result.success) {
            return NextResponse.json({ error: result.error || "Failed to start download" }, { status: 500 });
        }

        console.log(`🚀 Started download ${result.recordingId}`);

        return NextResponse.json({ recordingId: result.recordingId });
    } catch (err) {
        console.error("❌ Error starting download:", err);
        return NextResponse.json({ error: "Failed to start download" }, { status: 500 });
    }
}
