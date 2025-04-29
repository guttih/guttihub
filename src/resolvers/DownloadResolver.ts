// src/resolvers/DownloadResolver.ts

import { spawn } from "child_process";
import path from "path";
import { buildRecordingId, getExtensionFromUrl } from "@/utils/resolverUtils";
import { readDownloadJobFile, writeDownloadingJobFile } from "@/utils/fileHandler";
import { M3UEntry } from "@/types/M3UEntry";
import { outDirectories } from "@/config";
import { DownloadJob } from "@/types/DownloadJob";

export class DownloadResolver {
    static scriptDownload = path.resolve("src/scripts/download.sh");
    static stopDownloadScript = path.resolve("src/scripts/stop-record.sh"); // ✅ Same as live/record

    static async startDownload(params: {
        entry: M3UEntry;
        user: string;
        cacheKey: string;
    }): Promise<{ success: boolean; message?: string; cacheKey?: string; recordingId?: string; error?: string }> {
        try {
            const { entry, user, cacheKey } = params;
            const ext = getExtensionFromUrl(entry.url);
            const recordingId = buildRecordingId("download-", new Date(), entry.url, null);
            const outputFile = `${outDirectories.find((d) => d.label === "Recordings")?.path ?? outDirectories[0].path}/${recordingId}`;

            console.log(`🚀 Starting download job: ${recordingId}`);

            const job: DownloadJob = {
                recordingId,
                cacheKey,
                user,
                outputFile,
                logFile: `${outputFile}.log`,
                statusFile: `${outputFile}.status`,
                format: ext,
                recordingType: "download", // 🧠 Pretend it's HLS for compatibility
                startTime: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                entry,
                url: entry.url,
            };

            await writeDownloadingJobFile(job, true);

            const args = ["--url", entry.url, "--outputFile", outputFile, "--user", user, "--loglevel", "info"];

            spawn("bash", [DownloadResolver.scriptDownload, ...args], {
                detached: true,
                stdio: "ignore",
            }).unref();

            console.log(" -------------      Command given      -------------");
            console.log("bash", DownloadResolver.scriptDownload, ...args);
            console.log("----------------------------------------------------");

            console.log("✅ Download job launched");

            return {
                success: true,
                message: `Download ${recordingId} launched.`,
                cacheKey,
                recordingId,
            };
        } catch (err) {
            console.error("❌ DownloadResolver.startDownload failed", err);
            return { success: false, error: (err as Error).message };
        }
    }

    static async stopDownload(cacheKey: string): Promise<{ success: boolean; message?: string; error?: string }> {
        try {
            const job = await readDownloadJobFile(cacheKey);
            if (!job) throw new Error("Download job not found");

            const args = ["--outputFile", job.outputFile];

            spawn("bash", [DownloadResolver.stopDownloadScript, ...args], {
                detached: true,
                stdio: "ignore", // Don't block on stdout/stderr
            }).unref();

            console.log(`✅ Sent stop signal to download job ${job.recordingId}`);

            return { success: true, message: `Download ${job.recordingId} stopped.` };
        } catch (err) {
            console.error("❌ DownloadResolver.stopDownload failed", err);
            return { success: false, error: (err as Error).message };
        }
    }
}
