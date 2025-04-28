// src/app/api/live/start/route.ts

import { NextRequest } from "next/server";
import { outDirectories } from "@/config";
import { getRecordingIdByCacheKey } from "@/utils/resolverUtils";
import { readCashedEntryFile } from "@/utils/record/recordingJobUtils";
import { LiveResolver } from "@/resolvers/LiveResolver";

export async function POST(req: NextRequest) {
    const { cacheKey } = await req.json();

    if (!cacheKey) {
        return new Response(JSON.stringify({ error: "Missing live start cacheKey" }), { status: 400 });
    }
    // Before spawning live.sh
    const recordingId = await getRecordingIdByCacheKey(cacheKey);
    if (recordingId) {
        return new Response(
            JSON.stringify({
                error: "Stream already exists",
                recordingId: recordingId,
            }),
            { status: 409 }
        );
    }

    try {
        const entry = await readCashedEntryFile(cacheKey);
        if (!entry) {
            return new Response(JSON.stringify({ error: "Invalid or expired cache key" }), { status: 404 });
        }

        const location = outDirectories.find((d) => d.label === "Recordings");
        if (!location) throw new Error("Recording output directory not found");

        

        
        const result = await LiveResolver.startStream({
            cacheKey,
            entry,
            location: location.path
        });
        const recordingId = result.recordingId;
        return new Response(JSON.stringify({ recordingId, entry }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: (err as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
