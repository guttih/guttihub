// src/resolvers/LiveResolver.ts

import { spawn } from "child_process";
import path from "path";
import { LiveParams } from "@/types/LiveParams";
import { RecordingJob } from "@/types/RecordingJob";
import { getRecordingJobsDir, readJsonFile, writeRecordingJobFile } from "@/utils/fileHandler";
import { cleanupStreamingJobs, getHumanReadableTimestamp } from "@/utils/resolverUtils";

export class LiveResolver {
    static recordScript = path.resolve("src/scripts/live.sh");
    static stopRecordScript = path.resolve("src/scripts/stop-record.sh");

    static async stopRecording(recordingId: string): Promise<{ success: boolean; message?: string; error?: string }> {
        const jobPath = path.join(getRecordingJobsDir(), `${recordingId}.json`);
        const job = await readJsonFile<RecordingJob>(jobPath);
        const args = ["--outputFile", job.outputFile];

        spawn("bash", [LiveResolver.stopRecordScript, ...args], {
            detached: true,
            stdio: "ignore", // Don't wait on stdout/stderr
        }).unref();

        cleanupStreamingJobs();
        return {
            success: true,
            message: `Recording ${recordingId} stopped.`,
        };
    }

    static async startStream({ cacheKey, entry, user, outputFile }: LiveParams): Promise<{
        success: boolean;
        message?: string;
        error?: string;
        recordingId?: string;
    }> {
    

        const timestamp = getHumanReadableTimestamp();
        const lastSegment = entry.url.split("/").pop() ?? "unknown";
        const recordingId = `live-${timestamp}-${lastSegment}`;
        const logFile = `${outputFile}.log`;
        const statusFile = `${outputFile}.status`;

        const job: RecordingJob = {
            recordingId,
            cacheKey,
            duration: 60*60*6,
            user,
            outputFile,
            logFile,
            statusFile,
            format: "hls-live",
            recordingType: "hls",
            createdAt: new Date().toISOString(),
            startTime: new Date().toISOString()

        };

        const args = [  
            "--url", entry.url, 
            "--user", user,
            "--outputFile", outputFile, 
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
                success: true,
                message: `Recording ${recordingId} launched in background.`,
                recordingId: job.recordingId,
            };
    }
}
