// src/utils/resolverUtils.ts

import fs from "fs/promises";
import * as fsSync from "fs"; //todo: we should only use fs/promises I think
import path from "path";
import {
    readRecordingJobFile,
    readRecordingJobInfo,
    infoJsonExists,
    readFileRaw,
    getJobsDir,
    readDownloadJobFile,
    readDownloadJobInfo,
    deleteFileAndForget,
    fileExists,
} from "@/utils/fileHandler";
import { getCacheDir, readJsonFile, writeJsonFile } from "@/utils/fileHandler";
import { RecordingJob } from "@/types/RecordingJob";
import { DownloadJob } from "@/types/DownloadJob";
import { RecordingJobInfo } from "@/types/RecordingJobInfo";
import { getActiveLiveJobs } from "@/utils/record/recordingJobUtils";
import { M3UEntry } from "@/types/M3UEntry";
import { DownloadJobInfo } from "@/types/DownloadJobInfo";
import { isProcessAlive } from "./process";
import { getLatestStatus } from "./statusHelpers";

export function getBaseUrl(): string {
    const baseUrl = process.env.BASE_URL;

    if (!baseUrl) {
        throw new Error("BASE_URL is not set in the environment variables");
    }
    return baseUrl;
}

// Wraps a string with surrounding quotes to make it a valid shell argument
export function quoteShellArg(arg: string): string {
    return `"${arg.replace(/"/g, '\\"')}"`;
}

export function buildRecordingId(prefix: string, date: Date, url: string, extension: string | null = null): string {
    const dateStr = date.toISOString().slice(2, 19).replace(/[-:]/g, "").replace("T", "T");
    const streamId = url.trim().split("/").filter(Boolean).pop() ?? "unknown";
    const ext =
        extension && extension.trim() !== "" && extension.startsWith(".") ? extension : extension && extension.trim() !== "" ? `.${extension}` : "";
    const fileName = `${prefix}${dateStr}-${streamId}${ext}`;
    return fileName;
}

export function getExtensionFromUrl(url: string): string {
    const match = url.match(/\.(\w+)(?:\?|$)/);
    return match ? match[1].toLowerCase() : "mp4";
}

// 🕓 Timestamp like 240417T124312
export function getHumanReadableTimestamp(): string {
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

function addTimestampBeforeExtension(filePath: string, timestamp: string): string {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  return path.join(dir, `${base}-${timestamp}${ext}`);
}


/**
 * Read a recording’s .log file and return an array of non‑empty lines.
 */
export async function readJobLogFile(logPath: string): Promise<string[]> {
    try {
        if (!logPath || !(await fileExists(logPath))) return [];
        const text = await readFileRaw(logPath);
        return text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    } catch (err) {
        console.warn(`readRecordingLogFile: failed to read ${logPath}`, err);
        return [];
    }
}

/**
 * Read a recording’s .status file (key=value per line),
 * returning a map where repeated keys become arrays of values.
 */
export async function readJobStatusFile(statusPath: string): Promise<Record<string, string | string[]>> {
    const result: Record<string, string | string[]> = {};
    try {
        if (!statusPath || !(await fileExists(statusPath))) return result;
        const text = await readFileRaw(statusPath);
        for (const line of text.split(/\r?\n/).filter((l) => l.trim())) {
            const [key, ...rest] = line.split("=");
            const value = rest.join("=");
            if (!(key in result)) {
                result[key] = value;
            } else if (typeof result[key] === "string") {
                result[key] = [result[key] as string, value];
            } else {
                (result[key] as string[]).push(value);
            }
        }
    } catch (err) {
        console.warn(`readRecordingStatusFile: failed to read ${statusPath}`, err);
    }
    return result;
}

/** check whether a PID is still a live process */
export function isProcessRunning(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

// … your existing readRecordingLogFile & readRecordingStatusFile here …

/**
 * Scan your job dir and finalize any non‑running job (or just the one you passed).
 * Now also skips any job whose last‐seen PID is still alive.
 */
export async function cleanupStreamingJobs(targetJobId?: string): Promise<void> {
    const jobDir = getJobsDir();
    let files = (await fs.readdir(jobDir)).filter((f) => f.endsWith(".json"));
    if (targetJobId) {
        const f = `${targetJobId}.json`;
        if (!files.includes(f)) return console.warn(`No job ${targetJobId}`);
        files = [f];
    }

    // still use getActiveLiveJobs if you like, but PID is more bullet‑proof
    const active = await getActiveLiveJobs();
    const activeIds = new Set(active.map((j) => j.recordingId));

    for (const file of files) {
        const id = file.replace(/\.json$/, "");
        if (activeIds.has(id)) continue; // if your scheduler still thinks it’s live
        let job: RecordingJob;
        try {
            job = await readJsonFile<RecordingJob>(path.join(jobDir, file));
        } catch (e) {
            console.warn(`Cannot read job ${file}`, e);
            continue;
        }

        // pull PID out of the status file
        const status = await readJobStatusFile(job.statusFile);
        const rawPid = status.PID;
        const lastPidVal = Array.isArray(rawPid) ? rawPid[rawPid.length - 1] : rawPid;
        const pidNum = parseInt(lastPidVal as string, 10);

        if (!isNaN(pidNum) && isProcessRunning(pidNum)) {
            console.log(`Skipping ${id} — process ${pidNum} still running`);
            continue;
        }

        // finally, bundle & delete
        await processFinishedRecording(job);
    }
}

/**
 * Turn raw status‑file text into a key→value map.
 * Repeated keys become arrays of values.
 */
export function parseStatus(text: string): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = {};
    for (const line of text.split(/\r?\n/).filter((l) => l.trim().length > 0)) {
        const [key, ...rest] = line.split("=");
        const value = rest.join("=");
        if (!(key in result)) {
            result[key] = value;
        } else if (typeof result[key] === "string") {
            result[key] = [result[key] as string, value];
        } else {
            (result[key] as string[]).push(value);
        }
    }
    return result;
}

export async function getRecordingJobInfo(cacheKey: string | null, recordingId: string | null): Promise<RecordingJobInfo> {
    if (recordingId && infoJsonExists(recordingId)) {
        return await readRecordingJobInfo(recordingId);
    }

    if (!cacheKey) {
        throw new Error("Missing cacheKey");
    }
    const job = await readRecordingJobFile(cacheKey);
    const [logText, statusText, entry] = await Promise.all([
        readFileRaw(job.logFile),
        readFileRaw(job.statusFile),
        (await readRecordingJobFile(`recording-${job.cacheKey}`)).entry,
    ]);
    return {
        job,
        entry: entry!,
        logs: parseLog(logText),
        status: parseStatus(statusText),
    };
}

export async function getDownloadJobInfo(cacheKey: string | null, recordingId: string | null): Promise<DownloadJobInfo> {
    if (recordingId && infoJsonExists(recordingId)) {
        return await readDownloadJobInfo(recordingId); // ✅ now returns correct type
    }

    if (!cacheKey) {
        throw new Error("Missing cacheKey");
    }

    const job = await readDownloadJobFile(cacheKey);
    const [logText, statusText] = await Promise.all([readFileRaw(job.logFile), readFileRaw(job.statusFile)]);

    return {
        job,
        entry: job.entry,
        logs: parseLog(logText),
        status: parseStatus(statusText),
    };
}

/**
 * Looks up the recordingId that matches the given cacheKey.
 */
export async function getRecordingIdByCacheKey(cacheKey: string): Promise<string | null> {
    const dir = getJobsDir();
    const files = fsSync.readdirSync(dir).filter((f) => f.endsWith(".json"));

    for (const file of files) {
        const fullPath = path.join(dir, file);
        try {
            const job = await readJsonFile<RecordingJob>(fullPath);
            if (job?.cacheKey === cacheKey) {
                return job.recordingId;
            }
        } catch (err) {
            console.warn(`⚠ Failed to read job file: ${file}`, err);
        }
    }

    return null;
}

/**
 * Parse a .status file into a simple map of key→lastValue.
 * (Repeated keys simply get overwritten, so you end up with the final value.)
 */
export function parseLatestStatus(text: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const line of text.split(/\r?\n/).filter((l) => l.trim())) {
        const [key, ...rest] = line.split("=");
        result[key] = rest.join("=");
    }
    return result;
}

/**
 * Parse raw log text into non‑empty lines.
 */
export function parseLog(text: string): string[] {
    return text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
}

export async function deleteRecordingJob(recordingId: string, removeCasheAlso: boolean): Promise<void> {
    const jobFilePath = path.join(getJobsDir(), `${recordingId}.json`);
    if (fsSync.existsSync(jobFilePath)) {
        if (removeCasheAlso) {
            const job = await readJsonFile<RecordingJob>(jobFilePath);
            const cacheKey = job.cacheKey;
            const cacheFilePath = path.join(getCacheDir(), `${cacheKey}.json`);
            if (fsSync.existsSync(cacheFilePath)) {
                fsSync.unlinkSync(cacheFilePath);
            }
        }
        if (fsSync.existsSync(jobFilePath)) {
            fsSync.unlinkSync(jobFilePath);
        }
    }
}

export async function deleteDownloadJob(recordingId: string, removeCasheAlso: boolean): Promise<void> {
    const jobFilePath = path.join(getJobsDir(), `${recordingId}.json`);
    if (fsSync.existsSync(jobFilePath)) {
        if (removeCasheAlso) {
            const job = await readJsonFile<DownloadJob>(jobFilePath);
            const cacheKey = job.cacheKey;
            const cacheFilePath = path.join(getCacheDir(), `${cacheKey}.json`);
            if (fsSync.existsSync(cacheFilePath)) {
                fsSync.unlinkSync(cacheFilePath);
            }
        }
        if (fsSync.existsSync(jobFilePath)) {
            fsSync.unlinkSync(jobFilePath);
        }
    }
}

export function normalizeStatus(raw: string): "recording" | "done" | "error" | "downloading" | "live" | "unknown" {
    const s = raw.toLowerCase();
    if (s.includes("error")) return "error";
    if (s.includes("downloading")) return "downloading";
    if (s.includes("live")) return "live";
    if (s.includes("recording")) return "recording";
    if (s.includes("packaging") && s.includes("done")) return "done";
    if (s === "done" || s === "stopped") return "done";
    return "unknown";
}

export function humanizeStatus(raw: string): string {
    switch (normalizeStatus(raw)) {
        case "recording":
            return "Recording";
        case "downloading":
            return "Downloading";
        case "done":
            return "Done";
        case "error":
            return "Error";
        case "unknown":
            return "Unknown";
        default:
            return "Unknown";
    }
}

/**
 * Maps a DownloadJob to a RecordingJob format for monitoring UI.
 */

export function mapDownloadJobToRecordingJob(downloadJob: DownloadJob /*, status: DownloadStatus */): RecordingJob {
    // TODO: Later we might also use `status` to enrich or verify the job info
    return {
        recordingId: downloadJob.recordingId,
        cacheKey: downloadJob.cacheKey,
        user: downloadJob.user,
        outputFile: downloadJob.outputFile,
        logFile: downloadJob.logFile,
        statusFile: downloadJob.statusFile,
        duration: 0,
        format: downloadJob.format,
        recordingType: downloadJob.recordingType,
        startTime: downloadJob.startTime,
        createdAt: downloadJob.createdAt,
        entry: downloadJob.entry,
        finalOutputFile: downloadJob.finalOutputFile,
    };
}

export async function processFinishedDownload(job: DownloadJob): Promise<boolean> {
    // you’ll still need getEntryByCacheKey and deleteDownloadJob imported where it lives
    const logs = await readJobLogFile(job.logFile);
    const status = await readJobStatusFile(job.statusFile);

    // assemble and write the -info.json
    const info = { job, logs, status };
    const infoPath = path.join(getJobsDir(), `${job.recordingId}-info.json`);
    await writeJsonFile(infoPath, info);

    // now clean up
    await deleteDownloadJob(job.recordingId, true);
    // drop any leftover files quietly
    await Promise.all([deleteFileAndForget(job.logFile),deleteFileAndForget(job.statusFile),]);
      
    return true;
}

export async function getJobByCacheKey(cacheKey: string): Promise<RecordingJob | DownloadJob | null> {
    const jobPath = path.join(getJobsDir(), `${cacheKey}.json`);

    if (!(await fileExists(jobPath))) {
        return null;
    }

    try {
        const job = await readJsonFile<RecordingJob | DownloadJob>(jobPath);
        return job;
    } catch (err) {
        console.warn(`⚠️ Failed to parse job file for cacheKey ${cacheKey}:`, err);
        return null;
    }
}

// Perform any finalization steps for a job, like moving the destination to its final location
// and cleaning up temporary files.
// Function to move the file and finalize the job
export async function finalizeJobStart(cacheKey: string): Promise<boolean> {
    // Your existing logic here for finalizing the job, reading logs, and creating the info file

    const job = await getJobByCacheKey(cacheKey);

    if (!job) {
        console.warn(`⚠️ finalizeJobStart: No job found for cacheKey ${cacheKey}`);
        return false;
    }

    if (job.format === "hls-live" && !("url" in job)) {
        const liveJob = await readRecordingJobFile(cacheKey);
        processFinishedRecording(liveJob);
        return true;
    }

    // Create the info.json and do final cleanup
    const logs = await readJobLogFile(job.logFile);
    const status = await readJobStatusFile(job.statusFile);

    // Write the info.json file
    // Move the file to the final location (e.g., renaming or moving)
    // Now make sure the the finalOutputFile does not exit before renaming and if it does, we need change the finalOutputFile name and update the job
    if (await fileExists(job.finalOutputFile)) {
        const timestamp = getHumanReadableTimestamp();
        job.finalOutputFile = addTimestampBeforeExtension(job.finalOutputFile, timestamp);
    }
    

    await fs.rename(job.outputFile, job.finalOutputFile);

    const info = { job, logs, status };
    const infoFilePath = path.join(getJobsDir(), `${job.recordingId}-info.json`);
    const infoFilePathForMedia = `${job.finalOutputFile}.json`;
    await writeJsonFile(infoFilePath, info); // todo: make cleanupjob remove this file
    await writeJsonFile(infoFilePathForMedia, info); // this file should always exist for all recordings or jobs

    console.log(`✅ Moved ${job.outputFile} to ${job.finalOutputFile}`);

    // Clean up the old files (logs, status, etc.)
    await deleteJobFiles(job);

    console.log(`✅ Job info saved in: ${infoFilePath}`);
    return true; // Success
}

/**
 * Perform the full “read, parse, bundle into info.json, cleanup” for one job.
 * Returns true if it was processed (i.e. not live).
 */
export async function processFinishedRecording(job: RecordingJob): Promise<void> {
    // you’ll still need getEntryByCacheKey and deleteRecordingJob imported where it lives
    const logs = await readJobLogFile(job.logFile);
    const status = await readJobStatusFile(job.statusFile);

    // assemble and write the -info.json
    const info = { job, logs, status };
    const infoPath = path.join(getJobsDir(), `${job.recordingId}-info.json`);
    await writeJsonFile(infoPath, info);

    // now clean up
    const removeCasheAlso = job.format === "hls-live";
    await deleteRecordingJob(job.recordingId, removeCasheAlso);
    // drop any leftover files quietly
    await Promise.all([deleteFileAndForget(job.logFile),deleteFileAndForget(job.statusFile),]);
}

function deleteJobFiles(job: RecordingJob | DownloadJob): void {
    if (!job) return;

    if (
        job.outputFile &&
        job.outputFile !== job.finalOutputFile &&
        fsSync.existsSync(job.outputFile)
      ) {
        deleteFileAndForget(job.outputFile);
      }
      
    if (job.statusFile) deleteFileAndForget(job.statusFile);
    if (job.logFile) deleteFileAndForget(job.logFile);
}

export async function cleanupFinishedJobs(options: { force?: boolean } = {}): Promise<void> {
    const { force = false } = options;
    const jobDir = getJobsDir();
    const now = Date.now();
    const SEVEN_HOURS_MS = 7 * 60 * 60 * 1000; // 7 hours

    const files = await fs.readdir(jobDir);

    for (const file of files) {
        // Skip info bundles, these are not job metadata JSONs
        if (!file.endsWith(".json") || file.includes("-info")) continue;

        const filePath = path.join(jobDir, file);
        let job: RecordingJob | DownloadJob;

        try {
            job = await readJsonFile(filePath);
        } catch (e) {
            console.warn(`❌ Skipping unreadable job: ${file}`, e);
            continue;
        }

        const statusFile = job.statusFile;
        const finalOutputFile = job.finalOutputFile;
        const infoFilePath = path.join(jobDir, `${job.recordingId}-info.json`);

        // If force is true, skip the linked files check and just clean up the job
        if (!force) {
            // If the job is linked (i.e., the info.json and finalOutputFile exist), skip it
            if ((await fileExists(infoFilePath)) && (await fileExists(finalOutputFile))) {
                console.log(`💼 Skipping job ${job.recordingId} — linked job files exist.`);
                continue; // Skip cleanup for files that are linked
            }
        }

        // We now check if the file is older than 7 hours before considering it for deletion
        const fileAge = now - (await fs.stat(filePath)).mtimeMs;
        if (fileAge < SEVEN_HOURS_MS) {
            console.log(`⏳ Skipping file ${file} as it is younger than 7 hours.`);
            continue; // Skip any files younger than 7 hours
        }

        // **Ghost Jobs**: If the job has no .info.json or .finalOutputFile, it's a ghost job
        if (!(await fileExists(infoFilePath)) && !(await fileExists(finalOutputFile))) {
            console.log(`💀 Deleting ghost job: ${job.recordingId} — no associated files.`);
            await deleteJobFiles(job);
            continue; // Skip further processing for this ghost job
        }

        // **Zombie Jobs**: If the status is not "done," "stopped," or "error," but the job is not running, it’s a zombie job
        const status = await readJobStatusFile(statusFile);
        const statusValue = getLatestStatus(status.STATUS);
        const pidRaw = getLatestStatus(status.PID);
        const pidAlive = pidRaw ? await isProcessAlive(parseInt(pidRaw, 10)) : false;

        if (["done", "stopped", "error"].includes(statusValue)) {
            // If the job is "done," proceed with the cleanup
            console.log(`✅ Deleting completed job: ${job.recordingId}`);
            await deleteJobFiles(job);
        } else if (!pidAlive) {
            // Zombie job, process is dead but marked as still active
            console.log(`🧟 Deleting zombie job: ${job.recordingId} — process no longer alive.`);
            await deleteJobFiles(job);
        } else {
            console.log(`💤 Skipping active job: ${job.recordingId} — still running.`);
        }
    }
}

// export async function cleanupGhostCacheFiles(force = false): Promise<void> {
//     const cacheDir = getCacheDir();
//     const jobDir = getJobsDir();
//     const now = Date.now();

//     const allFiles = await fs.readdir(cacheDir);
//     const ghostCandidates = allFiles.filter((f) => f.startsWith("cache-") && f.endsWith(".json"));

//     const activeJobFiles = await fs.readdir(jobDir);
//     const usedCacheKeys = new Set<string>();
//     for (const file of activeJobFiles) {
//         if (!file.endsWith(".json") || file.includes("-info")) continue;
//         const job = await readJsonFile<{ cacheKey: string }>(path.join(jobDir, file));
//         if (job.cacheKey) {
//             usedCacheKeys.add(job.cacheKey);
//         }
//     }

//     for (const filename of ghostCandidates) {
//         const fullPath = path.join(cacheDir, filename);
//         try {
//             const stat = await fs.stat(fullPath);
//             const age = now - stat.mtimeMs;

//             const data = await readJsonFile<{ cacheKey?: string }>(fullPath);
//             const cacheKey = data.cacheKey || filename.replace(".json", "");

//             // If force is true, skip checking if it's linked to any job
//             if (force || !usedCacheKeys.has(cacheKey)) {
//                 console.warn(`👻 Deleting ghost cache file: ${filename} ${force ? "(forced)" : ""}`);
//                 deleteFileAndForget(fullPath);
//             }
//         } catch (err) {
//             console.error(`❌ Failed to check or delete ghost: ${filename}`, err);
//         }
//     }
// }

// 🔥 Create a safe filename from an M3UEntry
export function makeSafeDiskName(entry: M3UEntry): string {
    const base = entry.name || `untitled-${getHumanReadableTimestamp()}`;

    const safe = base
        .replace(/[^a-zA-Z0-9-_]/g, "_") // Replace anything not safe
        .replace(/_+/g, "_") // Collapse multiple underscores
        .replace(/^_+|_+$/g, "") // Trim underscores
        .toLowerCase();

    return safe || "untitled";
}

/**
 * Generate a sanitized final filename (without path) from an M3UEntry.
 *
 * @param entry The M3UEntry to base the name on
 * @param fallbackExtension Default extension to use (e.g., "mp4")
 * @param allowExtensionFromUrl If true, will try to extract extension from the entry's URL
 * @returns Safe filename like "my-movie-title.mp4"
 */
export function getFinalOutputFilename(entry: M3UEntry, fallbackExtension = "mp4", allowExtensionFromUrl = false): string {
    const baseName = makeSafeDiskName(entry);
    let extension = fallbackExtension;

    if (allowExtensionFromUrl && entry.url) {
        const match = entry.url.match(/\.(\w{2,5})(?:\?|$)/);
        if (match && match[1]) {
            extension = match[1].toLowerCase();
        }
    }

    return `${baseName}.${extension}`;
}
