// src/utils/record/recordingJobUtils.ts

import { RecordingJob } from "@/types/RecordingJob";
import { DownloadStatus } from "@/types/DownloadStatus";
import { StreamingServiceResolver } from "@/resolvers/StreamingServiceResolver";
import {
    fileExists,
    getCacheDir,
    getJobsDir,
    readFileRaw,
    readJsonFile,
    readStatusFile,
    readDownloadJobFile,
    ensureDownloadJobsDir,
} from "@/utils/fileHandler";
import { isProcessAlive } from "@/utils/process";
import path from "path";
import fs from "fs/promises";
import { parseLatestStatus } from "@/utils/resolverUtils";
import { MovieJob } from "@/types/MovieJob";
import { M3UEntry } from "@/types/M3UEntry";
import { DownloadJob } from "@/types/DownloadJob";
import { getMovieConsumers } from "@/utils/concurrency";
import { EnrichedJob } from "@/types/EnrichedJob";

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
export async function getActiveLiveJobs(): Promise<(RecordingJob | DownloadJob | MovieJob)[]> {
    const dir = getJobsDir();
    let files: string[];

    try {
        files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
    } catch {
        return [];
    }

    const active: (RecordingJob | DownloadJob)[] = [];

    await Promise.all(
        files.map(async (file) => {
            const fullPath = path.join(dir, file);
            let job: RecordingJob | DownloadJob;

            try {
                const txt = await fs.readFile(fullPath, "utf-8");
                job = JSON.parse(txt);
            } catch {
                return;
            }

            // Require a valid status file
            if (!job?.statusFile || !(await fileExists(job.statusFile))) return;

            try {
                const raw = await fs.readFile(job.statusFile, "utf-8");
                const status = parseLatestStatus(raw).STATUS;

                if (["live", "recording", "downloading"].includes(status)) {
                    const alive = await isPidRunningFromStatus(job.statusFile);
                    if (alive) {
                        active.push(job); // Either DownloadJob or RecordingJob
                    }
                }
            } catch {
                return;
            }
        })
    );

    const consumers = await getMovieConsumers(); // ✅ Await it
    for (const [id, meta] of consumers.entries()) {
        const consumerId = id;
        if (!meta.entry) continue;

        const now = new Date().toISOString();
        const job: MovieJob = {
            recordingId: meta.serviceId,
            cacheKey: consumerId,
            user: "inline", // or pull from session if stored
            outputFile: "",
            logFile: "",
            statusFile: "",
            finalOutputFile: "",
            duration: 0,
            format: "stream",
            recordingType: "movie",
            startTime: now,
            createdAt: now,
            entry: meta.entry,
        };

        active.push(job);
    }

    return active;
}

export async function getActiveDownloadJobs(): Promise<DownloadJob[]> {
    const jobsDir = getJobsDir();
    //.cache/recording-jobs/cache-1746952886376-77ab4ccd-b202-43ab-a0f0-22a1b0c3dd5a.json
    try {
        await ensureDownloadJobsDir();
        const files = await fs.readdir(jobsDir);
        const jobs: DownloadJob[] = [];

        for (const file of files) {
            try {
                //remove the .json extension
                const cacheKey = path.basename(file, ".json");
                const job = await readDownloadJobFile(cacheKey);
                if (!job.url || !job.statusFile || !(await fileExists(job.statusFile))) continue;

                const content = await fs.readFile(job.statusFile, "utf-8");
                const lines = content.split("\n").filter(Boolean);

                const raw = Object.fromEntries(
                    lines.map((line) => {
                        const [key, ...rest] = line.split("=");
                        return [key, rest.join("=")];
                    })
                ) as { [key: string]: string };

                const jobStatus: DownloadStatus = {
                    cacheKey: job.cacheKey,
                    STATUS: raw.STATUS,
                    STARTED_AT: raw.STARTED_AT,
                    URL: raw.URL,
                    OUTPUT_FILE: raw.OUTPUT_FILE,
                    USER: raw.USER,
                    PID: raw.PID,
                };

                if (jobStatus.STATUS === "downloading") {
                    jobs.push(job);
                }
            } catch {
                continue; // Not required, but explicit
            }
        }
        return jobs;
    } catch (err) {
        console.error("❌ Error reading active downloads directory:", err);
        return [];
    }
}
/** Reads all active downloading jobs */
// export async function getActiveDownloadJobsStatuses(jobs: DownloadJob[]): Promise<DownloadStatus[]> {
//     try {
//         await ensureDownloadJobsDir();
//         const downloadJobStatuses: DownloadStatus[] = [];
//         for (const job of jobs) {
//             try {
//                 //remove the .json extension
//                 if (!job.url || !job.statusFile || !(await fileExists(job.statusFile))) continue;

//                 const content = await fs.readFile(job.statusFile, "utf-8");
//                 const lines = content.split("\n").filter(Boolean);

//                 const raw = Object.fromEntries(
//                     lines.map((line) => {
//                         const [key, ...rest] = line.split("=");
//                         return [key, rest.join("=")];
//                     })
//                 ) as { [key: string]: string };

//                 const jobStatus: DownloadStatus = {
//                     cacheKey: job.cacheKey,
//                     STATUS: raw.STATUS,
//                     STARTED_AT: raw.STARTED_AT,
//                     URL: raw.URL,
//                     OUTPUT_FILE: raw.OUTPUT_FILE,
//                     USER: raw.USER,
//                     PID: raw.PID,
//                 };

//                 if (jobStatus.STATUS === "downloading") {
//                     downloadJobStatuses.push(jobStatus);
//                 }
//             } catch {
//                 continue; // Not required, but explicit
//             }
//         }

//         return downloadJobStatuses;
//     } catch (err) {
//         console.error("❌ Error reading active downloads directory:", err);
//         return [];
//     }
// }

// /**
//  * Return active download jobs (reading status files).
//  */
// export async function getActiveDownloadJobsStatuses(): Promise<DownloadJob[]> {
//     const dir = getJobsDir();
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

async function getAcriveDownloadJobStatus(job: DownloadJob): Promise<DownloadStatus | null> {
    //remove the .json extension
    try {
        if (!job.url || !job.statusFile || !(await fileExists(job.statusFile))) return null;

        const content = await fs.readFile(job.statusFile, "utf-8");
        const lines = content.split("\n").filter(Boolean);

        const raw = Object.fromEntries(
            lines.map((line) => {
                const [key, ...rest] = line.split("=");
                return [key, rest.join("=")];
            })
        ) as { [key: string]: string };

        const jobStatus: DownloadStatus = {
            cacheKey: job.cacheKey,
            STATUS: raw.STATUS,
            STARTED_AT: raw.STARTED_AT,
            URL: raw.URL,
            OUTPUT_FILE: raw.OUTPUT_FILE,
            USER: raw.USER,
            PID: raw.PID,
        };

        if (jobStatus.STATUS === "downloading") {
            return jobStatus;
        }
    } catch {
        return null; // Not required, but explicit
    }
    return null;
}

export async function enrichJob(job: RecordingJob | DownloadJob | MovieJob) {
    if (!job) return null;

    const isDownload = "url" in job;
    if (isDownload) {
        const downloadJobStatus = await getAcriveDownloadJobStatus(job as DownloadJob);
        if (downloadJobStatus) {
            return await enrichDownloadJob(downloadJobStatus);
        }
    }

    if (job.recordingType === "movie") {
        return await enrichMovieJob(job as MovieJob);
    }

    return await enrichRecordingJob(job as RecordingJob);
}

export async function enrichMovieJob(job: MovieJob): Promise<EnrichedJob> {
    const entry = job.entry ? job.entry : await readCashedEntryFile(job.cacheKey); //In the beginning there was only entry, on disk, then god came and populated the RecordingJob with the entry

    const resolver = new StreamingServiceResolver();
    const service = resolver.findById(job.recordingId);
    const name = service ? service.name : "Unknown Service";
    return {
        recordingId: job.recordingId,
        cacheKey: job.cacheKey,
        format: job.format,
        recordingType: job.recordingType,
        name: entry?.name ?? "Unknown Stream",
        groupTitle: entry?.groupTitle ?? "Unknown Group",
        startedAt: job.startTime,
        user: job.user,
        status: "playing",
        serviceName: name,
        tvgLogo: entry?.tvgLogo ?? "/fallback.png",
        duration: job.duration,
        finalOutputFile: job.finalOutputFile,
    };
}

export async function enrichRecordingJob(job: RecordingJob): Promise<EnrichedJob> {
    const entry = job.entry ? job.entry : await readCashedEntryFile(job.cacheKey); //In the beginning there was only entry, on disk, then god came and populated the RecordingJob with the entry
    const status = await readStatusFile(job.statusFile);

    let pid = null;
    if (status?.PID) {
        pid = parseInt(status.PID, 10);
    }

    const alive = pid ? await isProcessAlive(pid) : false;
    const resolver = new StreamingServiceResolver();
    const service = entry ? StreamingServiceResolver.extractServerFromUrl(entry.url) : null;
    const found = service ? resolver.findByServer(service) : null;
    const name = found?.name ?? "Unknown Service";

    let finalStatus = status?.STATUS || "unknown";
    if (finalStatus === "recording" && !alive) {
        // console.warn(`🧟 Zombie detected: job ${job.recordingId} is dead but status=recording`);
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
        user: job.user,
        status: finalStatus,
        serviceName: name,
        tvgLogo: entry?.tvgLogo ?? "/fallback.png",
        duration: job.duration,
        finalOutputFile: job.finalOutputFile,
    };
}

/**
 * Enrich a Download job (for download manager)
 */
export async function enrichDownloadJob(job: DownloadStatus) {
    const downloadJob = await readDownloadJobFile(job.cacheKey);
    const status = await readStatusFile(`${downloadJob.outputFile}.status`);

    const resolver = new StreamingServiceResolver();
    const serverFromUrl = downloadJob.entry?.url ? StreamingServiceResolver.extractServerFromUrl(downloadJob.entry.url) : null;
    const service = serverFromUrl ? resolver.findByServer(serverFromUrl) : null;

    return {
        recordingId: downloadJob.recordingId,
        cacheKey: downloadJob.cacheKey,
        format: downloadJob.format ?? "mp4",
        recordingType: "download",
        name: downloadJob.entry?.name ?? "Unknown Download",
        groupTitle: downloadJob.entry?.groupTitle ?? "Download",
        startedAt: status?.STARTED_AT ?? new Date().toISOString(),
        user: downloadJob.user,
        status: status?.STATUS ?? "unknown",
        serviceName: service?.name ?? "Download Manager",
        tvgLogo: downloadJob.entry?.tvgLogo ?? "/download-icon.png",
        finalOutputFile: downloadJob.finalOutputFile,
    };
}
