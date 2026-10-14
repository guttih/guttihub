import { NextRequest } from "next/server";
import { readRecordingPlaylist, validRecordingId } from "@/utils/record/recordingHls";
import { trackViewer } from "@/utils/liveViewers";
import { getWorkDir } from "@/utils/fileHandler";

export async function GET(req: NextRequest, context: unknown) {
    const { params } = context as { params: { recordingId: string } };
    const { recordingId } = await params;

    if (!validRecordingId(recordingId)) return new Response("Invalid recording ID", { status: 400 });

    trackViewer(recordingId, req.headers.get("x-forwarded-for") || "unknown");

    const recordDir = getWorkDir();
    if (!recordDir ) {
        return new Response("Recordings directory not found", { status: 404 });
    }

    const playlist = readRecordingPlaylist(recordDir, recordingId);
    if (!playlist) return new Response("Playlist not found", { status: 404 });

    return new Response(playlist, {
        status: 200,
        headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Cache-Control": "no-cache",
            "X-Stream-Format": "m3u8",
        },
    });
}
