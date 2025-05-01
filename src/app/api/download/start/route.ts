// src/app/api/download/start/route.ts

import { NextResponse } from "next/server";
import { DownloadResolver } from "@/resolvers/DownloadResolver";
import { M3UEntry } from "@/types/M3UEntry";
import { StreamingServiceResolver } from "@/resolvers/StreamingServiceResolver";
import { outDirectories } from "@/config";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const cacheKey: string = body.cacheKey;
        const entry: M3UEntry = body.entry;
        const user = body.user ?? "unknown";
        let destination: string = body.destination;

        if (!entry || !entry.url || !cacheKey) {
            return NextResponse.json({ error: "Invalid download start request" }, { status: 400 });
        }

        if (!destination) {
            const urlValues = StreamingServiceResolver.splitStreamingSearchUrl(entry.url);
            if (urlValues?.pathStart) {
                const location = outDirectories.find((d) => d.path.includes(urlValues.pathStart));
                if (location) {
                    destination = location.path;
                }
            }
        }
        if (!destination) {
            destination = outDirectories[0].path;  //Default to recording directory
        }

        const result = await DownloadResolver.startDownload({
            cacheKey,
            entry,
            user,
            destinationDir: destination,
        });

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
