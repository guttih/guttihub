import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/authOptions";
import { readJsonFile, getCacheDir, fileExists } from "@/utils/fileHandler";
import { M3UEntry } from "@/types/M3UEntry";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cacheKey = searchParams.get("cacheKey");

    if (!cacheKey) {
        return NextResponse.json({ error: "Missing cacheKey" }, { status: 400 });
    }

    const dir = getCacheDir();
    const recordingPath = `${dir}/recording_${cacheKey}.json`;
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
