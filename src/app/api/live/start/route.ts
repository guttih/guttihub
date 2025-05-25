// src/app/api/live/start/route.ts

import { NextRequest } from "next/server";
import { getRecordingIdByCacheKey } from "@/utils/resolverUtils";
import { readCashedEntryFile } from "@/utils/record/recordingJobUtils";
import { LiveResolver } from "@/resolvers/LiveResolver";
import { XresolveJobEntry } from "@/utils/job/XjobEntryHelpers";

export async function POST(req: NextRequest) {
    const { cacheKey, user } = await req.json();

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
        const entry = await XresolveJobEntry(undefined, cacheKey);
        if (!entry) {
            return new Response(JSON.stringify({ error: "Invalid or expired cache key" }), { status: 404 });
        }

        const result = await LiveResolver.startStream(cacheKey, entry, user);
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
