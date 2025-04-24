import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { promisify } from "util";

const stat = promisify(fs.stat);

export async function GET(req: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
    const { path: pathSegments = [] } = await context.params;

    const basePath = path.resolve(process.cwd(), "public", "videos");
    const fullPath = path.resolve(basePath, ...pathSegments);

    const isInsideBase = !path.relative(basePath, fullPath).startsWith("..");
    if (!isInsideBase) {
        return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileStat = await stat(fullPath);
    const fileSize = fileStat.size;
    const range = req.headers.get("range");

    const contentType = getMimeType(fullPath);

    if (range) {
        const match = range.match(/bytes=(\d+)-(\d*)/);
        const start = parseInt(match?.[1] ?? "0", 10);
        const end = match?.[2] ? parseInt(match[2], 10) : fileSize - 1;

        const stream = fs.createReadStream(fullPath, { start, end });

        return new NextResponse(stream as any, {
            status: 206,
            headers: {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": `${end - start + 1}`,
                "Content-Type": contentType,
                "Cache-Control": "no-cache",
            },
        });
    }

    const stream = fs.createReadStream(fullPath);
    return new NextResponse(stream as any, {
        status: 200,
        headers: {
            "Content-Length": fileSize.toString(),
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
        },
    });
}

function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case ".mp4":
            return "video/mp4";
        case ".mkv":
            return "video/x-matroska";
        case ".ts":
            return "video/mp2t";
        default:
            return "application/octet-stream";
    }
}



const unlink = promisify(fs.unlink);

export async function DELETE(req: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path: pathSegments = [] } = await context.params;

  const basePath = path.resolve(process.cwd(), "public", "videos");
  const fullPath = path.resolve(basePath, ...pathSegments);

  const isInsideBase = !path.relative(basePath, fullPath).startsWith("..");
  if (!isInsideBase) {
    return NextResponse.json({ error: "Invalid path" }, { status: 403 });
  }

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    await unlink(fullPath);
    return NextResponse.json({ message: "File deleted" });
  } catch (err) {
    console.error("❌ Failed to delete file:", err);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
