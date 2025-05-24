import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import path from "path";
import { StreamingServiceResolver } from "@/resolvers/StreamingServiceResolver";
import { Readable } from "stream";
import fs from "fs";
import { promisify } from "util";
import { deleteFileAndForget, fileExists } from "@/utils/fileHandler";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serviceId: string; filename: string[] }> }): Promise<NextResponse> {
    const { serviceId, filename } = await params;
    // filename is always string[] for [...filename]

    if (filename.length === 0) {
        return NextResponse.json({ error: "Filename is required" }, { status: 400 });
    }

    // Be extra-careful not to expose the filesystem

    const resolver = new StreamingServiceResolver();
    if (resolver.findById(serviceId) === undefined) {
        return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const safeFilename = path.join(...filename);
    const basePath = path.resolve(process.cwd(), "public/videos");
    const filePath = path.join(basePath, safeFilename);

    const doesNotContainRelative = !filePath.includes("..");
    if (!doesNotContainRelative) {
        return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    if (!existsSync(filePath)) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    try {
        // File exists, now, let's serve
        const ext = path.extname(filePath).slice(1);
        const contentType = getMimeType(ext);

        const stat = statSync(filePath);
        const range = request.headers.get("range");
        if (range) {
            const match = range.match(/bytes=(\d+)-(\d*)/);
            if (!match) {
                return NextResponse.json({ error: "Invalid Range header" }, { status: 416 });
            }

            const [, startStr, endStr] = match;
            const start = parseInt(startStr || "0", 10);
            const end = endStr ? parseInt(endStr, 10) : stat.size - 1;

            const chunkSize = end - start + 1;
            const nodeStream = createReadStream(filePath, { start, end });
            const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

            return new NextResponse(webStream, {
                status: 206,
                headers: {
                    "Content-Range": `bytes ${start}-${end}/${stat.size}`,
                    "Accept-Ranges": "bytes",
                    "Content-Length": chunkSize.toString(),
                    "Content-Type": contentType,
                    "Cache-Control": "public, max-age=3600",
                },
            });
        } else {
            const nodeStream = createReadStream(filePath);
            const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

            return new NextResponse(webStream, {
                status: 200,
                headers: {
                    "Content-Type": contentType,
                    "Cache-Control": "public, max-age=3600",
                    "Content-Length": stat.size.toString(),
                    "Accept-Ranges": "bytes",
                },
            });
        }
    } catch (err) {
        if (err instanceof Error) {
            console.error("❌ Failed to serve video:", err);
            return NextResponse.json({ error: "Failed to serve video" }, { status: 500 });
        } else {
            console.error("❌ Unknown error:", err);
            return NextResponse.json({ error: "Unknown error" }, { status: 500 });
        }
    }
}

function getMimeType(ext: string): string {
    switch (ext.toLowerCase()) {
        case "mp4":
            return "video/mp4";
        case "mkv":
            return "video/x-matroska";
        case "ts":
            return "video/mp2t";
        case "m3u8":
            return "application/vnd.apple.mpegurl";
        default:
            return "application/octet-stream";
    }
}

const unlink = promisify(fs.unlink);

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ serviceId: string; filename: string[] }> }
): Promise<NextResponse> {
    const { serviceId, filename } = await params;

    if (!serviceId || !filename || filename.length === 0) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const basePath = path.resolve(process.cwd(), "public/videos");
    const safeFilename = path.join(...filename); // joins the path, no slashes from the user
    const filePath = path.resolve(basePath, safeFilename); // resolves the full path

    // Ensure path is inside basePath
    const isInsideBase = filePath.startsWith(basePath);
    if (!isInsideBase) {
        return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    try {
        const stat = await fs.promises.stat(filePath);
        if (!stat.isFile()) {
            return NextResponse.json({ error: "Only files can be deleted" }, { status: 400 });
        }

        const infoPath = `${filePath}.json`;
        if (await fileExists(infoPath)) deleteFileAndForget(infoPath); //always delete the info file
        console.log("Media file deleting:", filePath);

        await unlink(filePath); //this could fail, but, hey, we at least removed the info file
        console.log("Media file deleting done:");
        return NextResponse.json({ message: "File deleted successfully" });
    } catch {
        return NextResponse.json({ error: "Unable to delete File" }, { status: 404 });
    }
}
