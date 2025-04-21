import { NextRequest } from "next/server";
import { outDirectories } from "@/config";
import { resolveSecureFile, streamFileRange } from "@/utils/videoServer";
import { nodeReadableToWebReadable } from "@/utils/nodeReadableToWebReadable";
import fs from "fs";

export async function GET(req: NextRequest, context: { params: Promise<{ directory: string; filename: string[] }> }) {
    const { directory, filename } = await context.params;
    const dir = outDirectories.find((d) => d.path === `public/videos/${directory}`);

    if (!dir) {
        return new Response("Invalid video directory", { status: 403 });
    }

    const filePath = resolveSecureFile(dir.path, filename);
    if (!filePath || !fs.existsSync(filePath)) {
        return new Response("File not found", { status: 404 });
    }
    const { stream, status, headers } = streamFileRange(filePath, req.headers.get("range"));

    const webStream = nodeReadableToWebReadable(stream);

    return new Response(webStream, {
        status,
        headers,
    });
}
