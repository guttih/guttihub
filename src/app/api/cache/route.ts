// src/app/api/cache/route.ts
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { writeJsonFile, ensureRecordingJobsDir, getCacheDir } from "@/utils/fileHandler";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/authOptions";

// Creates a cache entry 
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureRecordingJobsDir();

    // const cacheKey = `${session.user?.email?.split("@")[0] ?? "unknown"}-${Date.now()}-${uuidv4()}`;
    const cacheKey = `cache-${Date.now()}-${uuidv4()}`;
    const fullPath = `${getCacheDir()}/${cacheKey}.json`;

    try {
        const entry = await req.json(); // Don't parse manually — this is async in the App Router
        await writeJsonFile(fullPath, entry);
        return NextResponse.json({ cacheKey, entry });
    } catch (err) {
        console.error("Failed to cache entry", err);
        return NextResponse.json({ error: "Failed to write file" }, { status: 500 });
    }
}
