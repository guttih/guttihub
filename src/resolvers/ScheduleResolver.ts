// src/resolvers/ScheduleResolver.ts

import { spawn } from "child_process";
import path from "path";
import { ScheduleRecordingParams } from "@/types/ScheduleRecordingParams";
import { RecordingJob } from "@/types/RecordingJob";
import { getRecordingJobsDir, readJsonFile, writeRecordingJobFile } from "@/utils/fileHandler";
import { runJobctl } from "@/utils/jobctl";
import { cleanupStreamingJobs, getHumanReadableTimestamp } from "@/utils/resolverUtils";

export class ScheduleResolver {
    static scriptStartRecording = path.resolve("src/scripts/record.sh");
    static scriptStopRecording = path.resolve("src/scripts/stop-record.sh");

    static async stopRecording(recordingId: string): Promise<{ success: boolean; message?: string; error?: string }> {
        const jobPath = path.join(getRecordingJobsDir(), `${recordingId}.json`);
        const job = await readJsonFile<RecordingJob>(jobPath);
        const args = ["--outputFile", job.outputFile];

        spawn("bash", [ScheduleResolver.scriptStopRecording, ...args], {
            detached: true,
            stdio: "ignore", // Don't wait on stdout/stderr
        }).unref();

        cleanupStreamingJobs(recordingId);
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

        const args = [
            "--url",
            entry.url,
            "--duration",
            durationSec.toString(),
            "--user",
            user,
            "--outputFile",
            outputFile,
            "--recordingType",
            "hls",
            "--format",
            "mp4",
        ];

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
            console.log("Entire command:", ScheduleResolver.scriptStartRecording, ...args);
            // 🚀 Spawn the bash script in background (non-blocking)
            spawn("bash", [ScheduleResolver.scriptStartRecording, ...args], {
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
        const cmd = `bash ${ScheduleResolver.scriptStartRecording} ${args.map((a) => `"${a}"`).join(" ")}`;
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
