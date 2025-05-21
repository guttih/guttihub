import { NextRequest } from "next/server";
import { createReadStream, statSync, existsSync } from "fs";
import path, { join } from "path";
import { Readable } from "stream";
import { getWorkDir } from "@/utils/fileHandler";

export async function GET(
    req: NextRequest,
    context: unknown
  ) {
    const { params } = context as { params: { recordingId: string } };
    const { recordingId } = params;
  const recordDir = getWorkDir();

  if (!recordDir) {
    return new Response("Recordings directory not found", { status: 404 });
  }

  const filePath = join(path.resolve(recordDir), `${recordingId}.ts`);
  if (!existsSync(filePath)) {
    return new Response(`File not found: ${filePath}`, { status: 404 });
  }

  const stat = statSync(filePath);
  const range = req.headers.get("range");

  if (range) {
    const match = range.match(/bytes=(\d*)-(\d*)/);
    if (!match) {
      return new Response("Invalid Range header", { status: 416 });
    }

    const [, startStr, endStr] = match;
    const start = parseInt(startStr || "0", 10);
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1;

    const chunkSize = end - start + 1;
    const nodeStream = createReadStream(filePath, { start, end });
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

    return new Response(webStream, {
      status: 206,
      headers: {
        "Content-Type": "video/MP2T",
        "Content-Length": chunkSize.toString(),
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
      },
    });
  } else {
    const nodeStream = createReadStream(filePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": "video/MP2T",
        "Content-Length": stat.size.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
      },
    });
  }
}
