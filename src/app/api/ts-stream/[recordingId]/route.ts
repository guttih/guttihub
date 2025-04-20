import { NextRequest } from "next/server";
import { createReadStream, statSync, existsSync } from "fs";
import path, { join } from "path";
import { Readable } from "stream";
import { outDirectories } from "@/config";

type RecordingIdRouteContext = {
    params: {
      recordingId: string;
    };
  };

export async function GET(
   req: NextRequest,
  { params }: RecordingIdRouteContext
) {
  const { recordingId } = params;
  const recordDir = outDirectories.find((dir) => dir.label === "Recordings");

  if (!recordDir || !recordDir.path) {
    return new Response("Recordings directory not found", { status: 404 });
  }

  const filePath = join(path.resolve(recordDir.path), `${recordingId}.ts`);
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
