import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: { serviceId: string; filename: string[] } }
) {
  const { serviceId, filename } = params;

  const safeFilename = path.join(...filename);
  const basePath = path.resolve(process.cwd(), "public/videos", serviceId);
  const filePath = path.join(basePath, safeFilename);

  try {
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).slice(1);
    const contentType = getMimeType(ext);

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("❌ Failed to serve video:", err);
    return NextResponse.json({ error: "Failed to serve video" }, { status: 500 });
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
