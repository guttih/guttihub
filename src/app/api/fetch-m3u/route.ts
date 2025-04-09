import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import { ensureCacheDir, getCacheFilePath, isFileFresh, readFile, writeFile } from "@/utils/fileHandler";

const cacheDurationMs = 6 * 60 * 60 * 1000; // 6 hours

export async function POST(req: NextRequest) {
    const { url, username, serviceName } = await req.json();

    try {
        await ensureCacheDir();
        const cacheFilePath = getCacheFilePath(username, serviceName);

        if (await isFileFresh(cacheFilePath, cacheDurationMs)) {
            console.log("[CACHE] Using cached file:", cacheFilePath);
            const cachedContent = await readFile(cacheFilePath);
            return NextResponse.json({ data: cachedContent });
        }

        console.log(`[FETCH]Downloading fresh .m3u file for ${serviceName}`);
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0",
            },
            responseType: "text",
        });

        await writeFile(cacheFilePath, response.data);

        return NextResponse.json({ data: response.data });
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.error("[M3U FETCH ERROR]", err.message);
            return NextResponse.json({ error: err.message }, { status: 500 });
        } else {
            console.error("[M3U FETCH ERROR]", "Unknown error caught:", err);
            return NextResponse.json({ error: "[M3U FETCH ERROR] Unknown error" }, { status: 500 });
        }
    }
}
