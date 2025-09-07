// src/app/api/cache/[cacheKey]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCacheDir, fileExists, readJsonFile } from "@/utils/fileHandler";
import { auth } from "@/auth";
import { M3UEntry } from "@/types/M3UEntry";

// GET /api/cache/:cacheKey
export async function GET(request: NextRequest, { params }: { params: Promise<{ cacheKey: string; }> }): Promise<NextResponse> {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cacheKey } = await params;

    if (!cacheKey) {
        return NextResponse.json({ error: "Missing cacheKey" }, { status: 400 });
    }

    const dir = getCacheDir();
    const recordingPath = `${dir}/recording-${cacheKey}.json`;
    const entryPath = `${dir}/${cacheKey}.json`;

    try {
        let entry: M3UEntry|null = null;
        if (await fileExists(recordingPath)) {
            console.log("🔍 Found recording file:", recordingPath);
            entry = await readJsonFile<M3UEntry>(recordingPath);
        } else if (await fileExists(entryPath)) {
            console.log("🔍 Found entry file:", entryPath);
            entry = await readJsonFile<M3UEntry>(entryPath);
        } else {
            console.warn("❌ No cache file found for:", cacheKey);
            return NextResponse.json({ error: "Cache entry not found" }, { status: 404 });
        }
        
        return NextResponse.json({ entry, email: session.user?.email ?? "unknown" });
    } catch (err) {
        console.error("❌ Error reading entry file", err);
        return NextResponse.json({ error: "Failed to read entry" }, { status: 500 });
    }
}
