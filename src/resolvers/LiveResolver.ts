// src/resolvers/LiveResolver.ts

import { spawn } from "child_process";
import path from "path";
import { LiveParams } from "@/types/LiveParams";
import { RecordingJob } from "@/types/RecordingJob";
import { readRecordingJobFile, writeRecordingJobFile } from "@/utils/fileHandler";
import { buildRecordingId, cleanupStreamingJobs } from "@/utils/resolverUtils";

export class LiveResolver {
    static recordScript = path.resolve("src/scripts/live.sh");
    static stopRecordScript = path.resolve("src/scripts/stop-record.sh");

    static async stopRecording(cacheKey: string): Promise<{ success: boolean; message?: string; error?: string }> {
        
        const job = await readRecordingJobFile(cacheKey);
        // const jobPath = path.join(getRecordingJobsDir(), `${cacheKey}.json`);
        // const job = await readJsonFile<RecordingJob>(jobPath);
         const args = ["--outputFile", job.outputFile];

        spawn("bash", [LiveResolver.stopRecordScript, ...args], {
            detached: true,
            stdio: "ignore", // Don't wait on stdout/stderr
        }).unref();

        cleanupStreamingJobs();
        return {
            success: true,
            message: `Recording ${job.recordingId} stopped.`,
        };
    }

    static makeStreamFilePath(prefix: string, cashe: string): string {
        return `${prefix}/${cashe}`;
    }

    static async startStream({ cacheKey, entry, location }: LiveParams): Promise<{ recordingId: string; }> {
        const startTime = new Date().toISOString();
        const fileName= buildRecordingId("live-", new Date(), entry.url);
        const outputFile = LiveResolver.makeStreamFilePath(location, fileName);
        console.log("📦 Spaning live stream at ", outputFile);
        const job: RecordingJob = {
            recordingId: fileName,
            cacheKey,
            user: "live-session",
            outputFile,
            logFile: `${outputFile}.log`,
            statusFile: `${outputFile}.status`,
            duration: 60*60*6,
            format: "hls-live",
            recordingType: "hls",
            startTime,
            createdAt: startTime,
            entry

        };

        const args = [  
            "--url", entry.url, 
            "--user", job.user,
            "--outputFile", job.outputFile, 
            "--loglevel", "info"
        ];

        console.log("📝 Writing recording job metadata:", job);
        await writeRecordingJobFile(job);
        console.log("Entire command:", LiveResolver.recordScript, ...args); 
            // 🚀 Spawn the bash script in background (non-blocking)
            spawn("bash", [LiveResolver.recordScript, ...args], {
                detached: true,
                stdio: "ignore", // Don't wait on stdout/stderr
            }).unref();

            return {
                recordingId: job.recordingId,
            };
    }
}
