import { NextRequest } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import path from "path";
import { outDirectories } from "@/config";
import { Readable } from "stream";
import { trackViewer } from "@/utils/liveViewers";

export async function GET(
  req: NextRequest,
  context: unknown
) {
  const { params } = context as { params: { recordingId: string; filename: string } };
  const { recordingId, filename } = await params;

  trackViewer(recordingId, req.headers.get("x-forwarded-for") || "unknown");

  const recordDir = outDirectories.find((d) => d.label === "Recordings");

  if (!recordDir?.path) {
    return new Response("Recordings directory not found", { status: 404 });
  }

  const segmentPath = path.resolve(recordDir.path, `${recordingId}_hls`, filename);

  if (!existsSync(segmentPath)) {
    return new Response("Segment not found", { status: 404 });
  }

  const stat = statSync(segmentPath);
  const stream = createReadStream(segmentPath);
  const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": "video/MP2T",
      "Content-Length": stat.size.toString(),
      "Cache-Control": "no-cache",
    },
  });
}
