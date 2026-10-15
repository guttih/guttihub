import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { auth } from "@/auth";
import { hasModeratorAccess } from "@/utils/auth/accessControl";
import { getQueue } from "@/lib/downloads/queue";
import { getMediaDir, readDownloadJobInfo } from "@/utils/fileHandler";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || !hasModeratorAccess(session.user)) {
        return NextResponse.json({ error: "Moderator access required" }, { status: 403 });
    }
    const { id } = await params;
    const item = (await getQueue()).items.find((row) => row.id === id && row.status === "completed");
    if (!item) return NextResponse.json({ error: "Completed download not found" }, { status: 404 });

    try {
        const directory = path.resolve(getMediaDir());
        let filename = item.finalFileName;
        if (!filename && item.recordingId) {
            const info = await readDownloadJobInfo(item.recordingId);
            const output = path.resolve(info.job.finalOutputFile);
            if (path.dirname(output) !== directory) throw new Error("Invalid media path");
            filename = path.basename(output);
        }
        if (!filename || path.basename(filename) !== filename || /[\\\0]/.test(filename)) throw new Error("Invalid filename");
        const filePath = path.resolve(directory, filename);
        const realPath = await fs.realpath(filePath);
        if (path.dirname(realPath) !== await fs.realpath(directory)) throw new Error("Invalid media path");
        const stat = await fs.stat(realPath);
        if (!stat.isFile()) throw new Error("Media unavailable");
        const mimeTypes: Record<string, string> = { ".mp4": "video/mp4", ".mkv": "video/x-matroska", ".ts": "video/mp2t" };
        const headers = new Headers({
            "Content-Type": mimeTypes[path.extname(filename).toLowerCase()] ?? "application/octet-stream",
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, no-store",
        });
        const range = request.headers.get("range");
        let start = 0;
        let end = stat.size - 1;
        if (range) {
            const match = /^bytes=(\d*)-(\d*)$/.exec(range);
            if (match && (match[1] || match[2])) {
                start = match[1] ? Number(match[1]) : Math.max(0, stat.size - Number(match[2]));
                end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
            }
            if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || end >= stat.size) {
                return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
            }
            headers.set("Content-Range", `bytes ${start}-${end}/${stat.size}`);
        }
        headers.set("Content-Length", String(range ? end - start + 1 : stat.size));
        const stream = createReadStream(realPath, range ? { start, end } : undefined);
        return new NextResponse(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { status: range ? 206 : 200, headers });
    } catch {
        return NextResponse.json({ error: "Downloaded file is unavailable" }, { status: 404 });
    }
}
