// src/resolvers/ScheduleResolver.ts

import { spawn } from "child_process";
import path from "path";
import { ScheduleRecordingParams } from "@/types/ScheduleRecordingParams";
import { RecordingJob } from "@/types/RecordingJob";
import { readJsonFile, writeJsonFile } from "@/utils/fileHandler";
import { runJobctl } from "@/utils/jobctl";

export class ScheduleResolver {
    static recordScript = path.resolve("src/scripts/record.sh");
    static stopRecordScript = path.resolve("src/scripts/stop-record.sh");
    static recordingJobsDir = path.resolve(".cache/recording-jobs");

    static async stopRecording(recordingId: string): Promise<{ success: boolean; message?: string; error?: string }> {
        const jobPath = path.join(ScheduleResolver.recordingJobsDir, `${recordingId}.json`);
        const job = await readJsonFile<RecordingJob>(jobPath);
        const args = ["--outputFile", job.outputFile];

        spawn("bash", [ScheduleResolver.stopRecordScript, ...args], {
            detached: true,
            stdio: "ignore", // Don't wait on stdout/stderr
        }).unref();

        return {
            success: true,
            message: `Recording ${recordingId} stopped.`,
        };
    }

    static async scheduleRecording({ cacheKey, entry, durationSec, user, outputFile, recordNow, startTime }: ScheduleRecordingParams): Promise<{
        success: boolean;
        message?: string;
        error?: string;
        recordingId?: string;
    }> {
    

        const timestamp = getHumanReadableTimestamp();
        const lastSegment = entry.url.split("/").pop() ?? "unknown";
        const recordingId = `recording-${timestamp}-${lastSegment}`;
        const logFile = `${outputFile}.log`;
        const statusFile = `${outputFile}.status`;

        const args = [  "--url", entry.url, 
            "--duration",   durationSec.toString(), 
            "--user", user,
            "--outputFile", outputFile, 
            "--recordingType", "hls",
            "--format", "mp4"];

        const job: RecordingJob = {
            recordingId,
            cacheKey,
            user,
            outputFile,
            logFile,
            statusFile,
            duration: durationSec,
            format: "mp4",
            recordingType: "hls",
            createdAt: new Date().toISOString(),
            startTime: recordNow ? new Date().toISOString() : startTime ?? new Date().toISOString(),

        };

        console.log("📝 Writing recording job metadata:", job);
        await writeRecordingJobFile(job);

        if (recordNow) {
            console.log("Entire command:", ScheduleResolver.recordScript, ...args); 
            // 🚀 Spawn the bash script in background (non-blocking)
            spawn("bash", [ScheduleResolver.recordScript, ...args], {
                detached: true,
                stdio: "ignore", // Don't wait on stdout/stderr
            }).unref();

            return {
                success: true,
                message: `Recording ${recordingId} launched in background.`,
                recordingId: job.recordingId,
            };
        }

        // 🕓 Schedule the job via /api/schedule POST
        const cmd = `bash ${ScheduleResolver.recordScript} ${args.map((a) => `"${a}"`).join(" ")}`;
        const desc = `Recording ${entry.name} for ${durationSec}s`;

        try {
 
            const result = await runJobctl("add", startTime, desc, cmd);
            if (!result.ok) {
                return { success: false, error: result.error };
            }

            return {
                success: true,
                message: `Recording ${recordingId} scheduled at ${startTime}.`,
                recordingId: job.recordingId,
            };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    }
}

// 🧠 Helper to write the job metadata file
async function writeRecordingJobFile(job: RecordingJob): Promise<void> {
    const filePath = path.join(ScheduleResolver.recordingJobsDir, `${job.recordingId}.json`);
    await writeJsonFile(filePath, job);
}

// 🕓 Timestamp like 240417T124312
function getHumanReadableTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const yy = now.getFullYear().toString().slice(-2);
    const MM = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const HH = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    return `${yy}${MM}${dd}T${HH}${mm}${ss}`;
}
