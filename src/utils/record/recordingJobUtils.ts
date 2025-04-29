// src/utils/record/recordingJobUtils.ts

import { RecordingJob } from "@/types/RecordingJob";
import { DownloadStatus } from "@/types/DownloadStatus";
import { StreamingServiceResolver } from "@/resolvers/StreamingServiceResolver";
import { fileExists, getCacheDir, getRecordingJobsDir, readFileRaw, readJsonFile, readStatusFile, readDownloadJobFile } from "@/utils/fileHandler";
import { isProcessAlive } from "@/utils/process";
import path from "path";
import fs from "fs/promises";
import { parseLatestStatus } from "@/utils/resolverUtils";
import { M3UEntry } from "@/types/M3UEntry";

export async function readCashedEntryFile(cacheKey: string): Promise<M3UEntry | null> {
    const dir = getCacheDir();
    const recordingPath = `${dir}/${cacheKey}.json`;
    try {
        if (await fileExists(recordingPath)) {
            return await readJsonFile<M3UEntry>(recordingPath);
        } else {
            return null;
        }
    } catch {
        return null;
    }
}

export async function isPidRunningFromStatus(statusFilePath: string): Promise<boolean> {
    try {
        const raw = await readFileRaw(statusFilePath);
        const pidMatch = raw.match(/^PID=(\d+)/m);
        if (!pidMatch) return false;

        const pid = parseInt(pidMatch[1], 10);
        if (isNaN(pid)) return false;

        return await fileExists(`/proc/${pid}`);
    } catch {
        return false;
    }
}

/**
 * Return active LIVE recording jobs (recording or live + pid alive).
 */
export async function getActiveLiveJobs(): Promise<RecordingJob[]> {
    const dir = getRecordingJobsDir();
    let files: string[];
    try {
        files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
    } catch {
        return [];
    }

    const active: RecordingJob[] = [];
    await Promise.all(
        files.map(async (file) => {
            const fullPath = path.join(dir, file);
            let job: RecordingJob;
            try {
                const txt = await fs.readFile(fullPath, "utf-8");
                job = JSON.parse(txt) as RecordingJob;
            } catch {
                return;
            }

            try {
                await fs.access(job.statusFile);
            } catch {
                return;
            }

            const raw = await fs.readFile(job.statusFile, "utf-8");
            const status = parseLatestStatus(raw).STATUS;

            if (status === "live" || status === "recording" || status === "downloading") {
                const pidAlive = await isPidRunningFromStatus(job.statusFile);
                if (pidAlive) {
                    active.push(job);
                } else {
                    console.warn(`🧟 Zombie detected: job ${job.recordingId} is dead but status=${status}`);
                }
            }
        })
    );

    return active;
}

// /**
//  * Return active download jobs (reading status files).
//  */
// export async function getActiveDownloadJobs(): Promise<DownloadJob[]> {
//     const dir = getRecordingJobsDir();
//     let files: string[];
//     try {
//         files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
//     } catch {
//         return [];
//     }

//     const active: DownloadJob[] = [];

//     for (const file of files) {
//         const fullPath = path.join(dir, file);

//         try {
//             const downloadJob = await readDownloadJobFile(path.basename(file, ".json"));
//             if (!downloadJob) continue;

//             const status = await readRecordingStatusFile(downloadJob.statusFile);
//             if (!status) continue;

//             if (status.STATUS === "downloading") {
//                 active.push(downloadJob);
//             }
//         } catch (err) {
//             console.warn(`⚠️ Failed to load download job for ${file}:`, err);
//             continue;
//         }
//     }

//     return active;
// }


/**
 * Enrich a RecordingJob (for live/scheduled recordings)
 */
export async function enrichRecordingJob(job: RecordingJob) {
    const entry = job.entry? job.entry : await readCashedEntryFile( job.cacheKey);  //In the beginning there was only entry, on disk, then god came and populated the RecordingJob with the entry
    const status = await readStatusFile(job.statusFile);

    let pid = null;
    if (status?.PID) {
        pid = parseInt(status.PID, 10);
    }

    const alive = pid ? await isProcessAlive(pid) : false;
    const resolver = new StreamingServiceResolver();
    const service = entry ? StreamingServiceResolver.extractServerFromUrl(entry.url) : null;
    const name= service ? resolver.findByServer(service)?.name : "Unknown Service";

    let finalStatus = status?.STATUS || "unknown";
    if (finalStatus === "recording" && !alive) {
        console.warn(`🧟 Zombie detected: job ${job.recordingId} is dead but status=recording`);
        finalStatus = "error";
    }

    return {
        recordingId: job.recordingId,
        cacheKey: job.cacheKey,
        format: job.format,
        recordingType: "hls",
        name: entry?.name ?? "Unknown Stream",
        groupTitle: entry?.groupTitle ?? "Unknown Group",
        startedAt: job.startTime,
        status: finalStatus,
        serviceName: name,
        tvgLogo: entry?.tvgLogo ?? "/fallback.png",
    };
}

/**
 * Enrich a Download job (for download manager)
 */
export async function enrichDownloadJob(job: DownloadStatus) {
    const cacheKey = job.OUTPUT_FILE
        ? job.OUTPUT_FILE.split("/").pop()?.replace(/\.(mp4|mkv|ts)$/i, "") || "unknown-download"
        : "unknown-download";

    const downloadJob = await readDownloadJobFile(cacheKey);
    const status = await readStatusFile(`${downloadJob.outputFile}.status`);

    const resolver = new StreamingServiceResolver();
    const service = downloadJob.entry ? resolver.findByServer(downloadJob.entry.url) : null;

    return {
        recordingId: downloadJob.recordingId,
        cacheKey: cacheKey,
        format: downloadJob.format ?? "mp4",
        recordingType: "download",
        name: downloadJob.entry?.name ?? "Unknown Download",
        groupTitle: downloadJob.entry?.groupTitle ?? "Download",
        startedAt: status?.STARTED_AT ?? new Date().toISOString(),
        status: status?.STATUS ?? "unknown",
        serviceName: service?.name ?? "Download Manager",
        tvgLogo: downloadJob.entry?.tvgLogo ?? "/download-icon.png",
    };
}
