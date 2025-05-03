// src/resolvers/ScheduleResolver.ts

import { spawn } from "child_process";
import { ScheduleRecordingParams } from "@/types/ScheduleRecordingParams";
import { RecordingJob } from "@/types/RecordingJob";
import { getMediaDir, getScriptPath, getWorkDir, readRecordingJobFile, writeRecordingJobFile } from "@/utils/fileHandler";
import { runJobctl } from "@/utils/jobctl";
import { buildRecordingId, cleanupStreamingJobs, getBaseUrl, getFinalOutputFilename, quoteShellArg } from "@/utils/resolverUtils";
import { M3UEntry } from "@/types/M3UEntry";
import { Job, JobctlAddSuccess } from "@/types/Jobctl";

export class ScheduleResolver {
    static scriptStartRecording = getScriptPath("record.sh");
    static scriptStopRecording = getScriptPath("stop-record.sh");

    static async stopRecording(cacheKey : string): Promise<{ success: boolean; message?: string; error?: string }> {
        const job = await readRecordingJobFile(cacheKey);
        const args = ["--outputFile", job.outputFile];

        spawn("bash", [ScheduleResolver.scriptStopRecording, ...args], {
            detached: true,
            stdio: "ignore", // Don't wait on stdout/stderr
        }).unref();

        cleanupStreamingJobs(job.recordingId);
        return {
            success: true,
            message: `Recording ${job.recordingId} stopped.`,
        };
    }


      static buildRecordingJob(params: {
        
        cacheKey: string;
        user: string;
        durationSec: number;
        recordNow: boolean;
        startTime?: string;
        entry: M3UEntry;
    }): RecordingJob {

        const fileName= buildRecordingId("recording-", new Date(), params.entry.url, "mp4");
        const workDir = getWorkDir();
        const outputFile = `${workDir}/${fileName}`
        const createdAt = new Date().toISOString();
        const effectiveStartTime = params.recordNow ? createdAt : params.startTime ?? createdAt;
        const finalOutputFile = `${getMediaDir()}/${ getFinalOutputFilename(params.entry, "mp4", false)}`;
        
        return {
            recordingId: fileName,
            cacheKey: params.cacheKey,
            user: params.user,
            outputFile:outputFile,
            finalOutputFile: finalOutputFile,
            logFile: `${outputFile}.log`,
            statusFile: `${outputFile}.status`,
            duration: params.durationSec,
            format: "mp4",
            recordingType: "hls",
            createdAt,
            startTime: effectiveStartTime,
            entry: params.entry,

        };
    }
    
    
    static async scheduleRecording(params: ScheduleRecordingParams): Promise<{
        success: boolean;
        message?: string;
        error?: string;
        recordingId?: string;
        cacheKey ?: string;
        job?: Job;
    }> {

        
        const job = ScheduleResolver.buildRecordingJob(params);


        const args = [
                "--url",           params.entry.url,
                "--duration",      params.durationSec.toString(),
                "--user",          quoteShellArg(params.user),
                "--outputFile",    quoteShellArg(job.outputFile),
                "--recordingType", "hls",
                "--format",        "mp4",
                "--baseUrl" ,      getBaseUrl(),
                "--cacheKey",      params.cacheKey,
            ];
        
    
        console.log("📝 Writing recording job metadata:", job);
        
        await writeRecordingJobFile(job, true);
    
        if (params.recordNow) {
            console.log("Entire command:", ScheduleResolver.scriptStartRecording, ...args);
            spawn("bash", [ScheduleResolver.scriptStartRecording, ...args], {
                detached: true,
                stdio: "ignore",
            }).unref();

            // Lets console.log the whole command so we can test it in the terminal
            console.log(" -------------      Command given      -------------");
            console.log("bash", ScheduleResolver.scriptStartRecording, ...args);
            console.log("----------------------------------------------------");

    
            return {
                success: true,
                message: `Recording ${job.recordingId} launched in background.`,
                recordingId: job.recordingId,
                cacheKey: job.cacheKey
            };
        }
        
        // Schedule the job using jobctl 
        const cmd = `bash ${ScheduleResolver.scriptStartRecording} ${args.map((a) => `"${a}"`).join(" ")}`;
        const desc = `Recording ${params.entry.name} for ${params.durationSec}s [${job.cacheKey}]`;
    
        try {
            const result = await runJobctl("add", job.startTime, desc, cmd)
            if (!result.ok) {
                return { success: false, error: result.error };
            }
            const addResult = result as JobctlAddSuccess;
            return {
                success: true,
                message: `Recording ${job.recordingId} scheduled at ${job.startTime}.`,
                recordingId: job.recordingId,
                cacheKey: job.cacheKey,
                job: addResult.job
            };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    }
    
}
