// src/resolvers/LiveResolver.ts

import { spawn } from "child_process";
import path from "path";
import { LiveParams } from "@/types/LiveParams";
import { RecordingJob } from "@/types/RecordingJob";
import { readRecordingJobFile, writeRecordingJobFile } from "@/utils/fileHandler";
import { buildRecordingId } from "@/utils/resolverUtils";

export class LiveResolver {
    static startStreamScript = path.resolve("src/scripts/live.sh");
    static stopStreamScript = path.resolve("src/scripts/stop-record.sh");

    static async stopStream(cacheKey: string): Promise<{ success: boolean; message?: string; error?: string }> {
        try {
          const job = await readRecordingJobFile(cacheKey);
          if (!job) throw new Error("Live job not found");
    
          const args = ["--outputFile", job.outputFile];
    
          spawn("bash", [LiveResolver.stopStreamScript, ...args], {
            detached: true,
            stdio: "ignore",
          }).unref();
    
          return { success: true };
        } catch (err) {
          console.error("❌ LiveResolver.stopStream failed", err);
          return { success: false, error: (err as Error).message };
        }
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
        console.log("Entire command:", LiveResolver.startStreamScript, ...args); 
            // 🚀 Spawn the bash script in background (non-blocking)
            spawn("bash", [LiveResolver.startStreamScript, ...args], {
                detached: true,
                stdio: "ignore", // Don't wait on stdout/stderr
            }).unref();

            return {
                recordingId: job.recordingId,
            };
    }
}
