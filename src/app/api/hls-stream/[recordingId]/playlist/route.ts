import { NextRequest } from "next/server";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { trackViewer } from "@/utils/liveViewers";
import { getWorkDir } from "@/utils/fileHandler";

export async function GET(req: NextRequest, context: unknown) {
    const { params } = context as { params: { recordingId: string } };
    const { recordingId } = await params;

    trackViewer(recordingId, req.headers.get("x-forwarded-for") || "unknown");

    const recordDir = getWorkDir();
    if (!recordDir ) {
        return new Response("Recordings directory not found", { status: 404 });
    }

    const playlistPath = path.resolve(recordDir, `${recordingId}.m3u8`);
    if (!existsSync(playlistPath)) {
        return new Response("Playlist not found", { status: 404 });
    }

    let playlist = readFileSync(playlistPath, "utf-8");

    // 🧙 Rewrite segment URLs
    const segmentBaseUrl = `/api/hls-stream/${recordingId}/segments/`;
    playlist = playlist.replace(/^(.*\/)?segment_(\d+)\.ts$/gm, (_, __, num) => `${segmentBaseUrl}segment_${num}.ts`);
    return new Response(playlist, {
        status: 200,
        headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Cache-Control": "no-cache",
            "X-Stream-Format": "m3u8",
        },
    });
}
