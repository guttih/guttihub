// src/resolvers/LiveResolver.ts

import { spawn } from "child_process";
import { RecordingJob } from "@/types/RecordingJob";
import { getScriptPath, getWorkDir, readRecordingJobFile, writeRecordingJobFile } from "@/utils/fileHandler";
import { buildRecordingId, getBaseUrl, quoteShellArg } from "@/utils/resolverUtils";
import { M3UEntry } from "@/types/M3UEntry";

export class LiveResolver {
    static startStreamScript = getScriptPath("live.sh");
    static stopStreamScript = getScriptPath("stop-record.sh");

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

    static async startStream( cacheKey:string, entry:M3UEntry ): Promise<{ recordingId: string; }> {
        const startTime = new Date().toISOString();
        const fileName= buildRecordingId("live-", new Date(), entry.url);
        const outputFile = LiveResolver.makeStreamFilePath(getWorkDir(), fileName);
        
        console.log("📦 Spaning live stream at ", outputFile);
        const job: RecordingJob = {
            recordingId: fileName,
            cacheKey,
            user: "live-session",
            outputFile,
            finalOutputFile: "",
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
            "--url",        entry.url, 
            "--user",       quoteShellArg(job.user),
            "--outputFile", quoteShellArg(job.outputFile), 
            "--baseUrl",    getBaseUrl(),  
            "--cacheKey",   cacheKey,
            "--loglevel",   "info",
        ];

        console.log("📝 Writing recording job metadata:", job);
        await writeRecordingJobFile(job, true);
        //Now when we have created the a cashe?.json file with RecodingJob data added instead of only the entry data, we can remove the the old one, if it exists
        

        console.log("Entire command:", LiveResolver.startStreamScript, ...args); 
            // 🚀 Spawn the bash script in background (non-blocking)
        spawn("bash", [LiveResolver.startStreamScript, ...args], {
            detached: true,
            stdio: "ignore", // Don't wait on stdout/stderr
        }).unref();

        console.log(" -------------      Command given      -------------");
        console.log("bash", LiveResolver.startStreamScript, ...args);
        console.log("----------------------------------------------------");
        
        return { recordingId: job.recordingId };
    }
}
