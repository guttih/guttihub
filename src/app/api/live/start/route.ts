// src/app/api/live/start/route.ts

import { NextRequest } from "next/server";
import path from "path";
import { getCacheDir, readJsonFile, writeRecordingJobFile } from "@/utils/fileHandler";
import { M3UEntry } from "@/types/M3UEntry";
import { spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { outDirectories } from "@/config";

export async function POST(req: NextRequest) {
    const { cacheKey } = await req.json();

    if (!cacheKey) {
        return new Response(JSON.stringify({ error: "Missing cacheKey" }), { status: 400 });
    }

    try {
        const entryPath = `${getCacheDir()}/${cacheKey}.json`;
        const entry = await readJsonFile<M3UEntry>(entryPath);

        const recordingId = `recording-${new Date().toISOString().replace(/[-:.]/g, "").slice(2, 15)}-${uuidv4().slice(0, 6)}`;
        const location = outDirectories.find((d) => d.label === "Recordings");
        if (!location) throw new Error("Recording output directory not found");

        const outputFile = path.resolve(location.path, `${recordingId}.mp4`);
        const logFile = `${outputFile}.log`;
        const statusFile = `${outputFile}.status`;
        const scriptPath = path.resolve(process.cwd(), "src/scripts/live.sh");

        const proc = spawn(scriptPath, ["--url", entry.url, "--user", "live-session", "--outputFile", outputFile], {
            detached: true,
            stdio: "ignore",
        });
        proc.unref();

        await writeRecordingJobFile({
            recordingId,
            cacheKey,
            user: "live-session",
            outputFile,
            logFile,
            statusFile,
            duration: 0,
            format: "hls-live",
            startTime: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            recordingType: "hls",
        });

        return new Response(JSON.stringify({ recordingId, entry }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: (err as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
