// src/utils/resolverUtils.ts

import fs from "fs/promises";
import * as fsSync from "fs"; //todo: we should only use fs/promises I think
import path from "path";
import {
    getJobsDir,
    getCacheDir,
    getWorkDir,
    getMediaDir,
    readRecordingJobFile,
    readRecordingJobInfo,
    infoJsonExists,
    readFileRaw,
    readJsonFile,
    writeJsonFile,
    readDownloadJobFile,
    readDownloadJobInfo,
    deleteFileAndForget,
    fileExists,
} from "@/utils/fileHandler";

import { RecordingJob } from "@/types/RecordingJob";
import { DownloadJob } from "@/types/DownloadJob";
import { RecordingJobInfo } from "@/types/RecordingJobInfo";
import { getActiveLiveJobs } from "@/utils/record/recordingJobUtils";
import { M3UEntry } from "@/types/M3UEntry";
import { DownloadJobInfo } from "@/types/DownloadJobInfo";
import { isProcessAlive } from "./process";
import { getLatestStatus } from "./statusHelpers";
import { CleanupCandidate } from "@/types/CleanupCandidate";
import { appConfig } from "@/config/index"; // Import appConfig if needed
import { expandAllJobs } from "./JobctlMetaExpander";

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
    await Promise.all([deleteFileAndForget(job.logFile), deleteFileAndForget(job.statusFile)]);

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

    await fs.rename(job.outputFile, job.finalOutputFile); //todo: what if filename already exists... do we account for that?

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
    await Promise.all([deleteFileAndForget(job.logFile), deleteFileAndForget(job.statusFile)]);
}

function deleteJobFiles(job: RecordingJob | DownloadJob): void {
    if (!job) return;

    if (job.outputFile && job.outputFile !== job.finalOutputFile && fsSync.existsSync(job.outputFile)) {
        deleteFileAndForget(job.outputFile);
    }

    if (job.statusFile) deleteFileAndForget(job.statusFile);
    if (job.logFile) deleteFileAndForget(job.logFile);
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

async function cleanOldCacheFiles(maxAgeMs: number): Promise<void> {
    const files = await fs.readdir(getCacheDir());
    const candidates = files.filter((f) => f.startsWith("cache-") && f.endsWith(".json"));
    const usedKeys = new Set((await fs.readdir(getJobsDir())).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")));

    for (const file of candidates) {
        const fullPath = path.join(getCacheDir(), file);
        const stat = await fs.stat(fullPath);
        if (Date.now() - stat.mtimeMs > maxAgeMs && !usedKeys.has(file.replace(".json", ""))) {
            console.log(`🪓🧊cache : ${fullPath}`);
            await deleteFileAndForget(fullPath);
        }
    }
}

async function cleanOldJobInfoFiles(maxAgeMs: number): Promise<void> {
    const files = await fs.readdir(getJobsDir());
    for (const file of files) {
        if (!file.endsWith("-info.json")) continue;
        const fullPath = path.join(getJobsDir(), file);
        const stat = await fs.stat(fullPath);
        const jobId = file.replace("-info.json", "");
        const correspondingFinalFile = path.join(getMediaDir(), `${jobId}.json`);

        if (Date.now() - stat.mtimeMs > maxAgeMs && !(await fileExists(correspondingFinalFile))) {
            console.log(`🪓💡Info  : ${fullPath}`);
            await deleteFileAndForget(fullPath);
        }
    }
}

// async function cleanOrphanedWorkFiles(maxAgeMs: number): Promise<void> {
//     const files = await fs.readdir(getWorkDir());
//     const trackedFinals = new Set((await fs.readdir(getJobsDir())).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")));

//     for (const file of files) {
//         if (!/\.(log|status|part)$/.test(file)) continue;
//         const fullPath = path.join(getWorkDir(), file);
//         const stat = await fs.stat(fullPath);
//         const base = file.replace(/\.(log|status|part)$/, "");
//         if (Date.now() - stat.mtimeMs > maxAgeMs && !trackedFinals.has(base)) {
//             console.log(`🪓🚧Orphan: ${fullPath}`);
//             await deleteFileAndForget(fullPath);
//         }
//     }
// }

async function cleanOrphanedWorkFiles(maxAgeMs: number): Promise<void> {
    const dir = getWorkDir();
    const entries = await fs.readdir(dir, { withFileTypes: true });

    const trackedFinals = new Set((await fs.readdir(getJobsDir())).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")));

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const stat = await fs.stat(fullPath);
        const age = Date.now() - stat.mtimeMs;

        // 🧼 Cleanup .log, .status, .part files
        if (entry.isFile() && /\.(log|status|part)$/.test(entry.name)) {
            const baseWithExt = entry.name.replace(/\.(log|status|part)$/, ""); // e.g. download-foo.mkv
            const base = baseWithExt.replace(/\.\w+$/, ""); // strips .mkv/.mp4/.ts
            if (age > maxAgeMs && !trackedFinals.has(base)) {
                console.log(`🪓 Orphan file: ${fullPath}`);
                await deleteFileAndForget(fullPath);
            }
        }

        // 🧼 Cleanup *_hls/ directories
        if (entry.isDirectory() && entry.name.endsWith("_hls")) {
            const base = entry.name.replace(/-?playlist?_?hls$/, ""); // fallback regex
            if (age > maxAgeMs && !trackedFinals.has(base)) {
                console.log(`🧹 Orphan HLS dir: ${fullPath}`);
                await fs.rm(fullPath, { recursive: true, force: true });
            }
        }
    }
}

async function cleanOrphanedMediaJson(maxAgeMs: number): Promise<void> {
    const files = await fs.readdir(getMediaDir());

    for (const file of files) {
        if (!file.endsWith(".json")) continue;

        const fullPath = path.join(getMediaDir(), file);
        const stat = await fs.stat(fullPath);
        const age = Date.now() - stat.mtimeMs;

        const correspondingMediaFile = fullPath.replace(/\.json$/, ""); // strip only last `.json`

        if (age > maxAgeMs && !(await fileExists(correspondingMediaFile))) {
            console.log(`🪓🎬 Orphan media .json: ${fullPath}`);
            await deleteFileAndForget(fullPath);
        }
    }
}

/**
 * Delete any .json file that is more than 8 hours old and does not point existing finalOutputFile
 *
 */

export async function deleteOldDanglingJobs(force: boolean = false): Promise<void> {
    // We need to search in 4 folders for these files:
    // 1. cache dir
    //   - .cache/cache-1747469404211-d7e0ba2e-edf9-40d4-9b0c-a2b81aa9d791.json
    //   - Search criteria: older than 8 hours and match .cache/cache-*.json -> dir = getCacheDir()
    // 2. jobs dir, example:
    //   - .cache/recording-jobs/cache-1747486473910-7b2415a9-ce17-474a-9b5b-4988be092e46.json
    //   - .cache/recording-jobs/download-250517T125433-897760.mkv-info.json
    //   - .cache/recording-jobs/download-250513T200235-1204237.mkv-info.json
    //   - .cache/recording-jobs/live-250511T235806-1290307-info.json
    //   - .cache/recording-jobs/recording-250513T201125-64374.mp4-info.json
    //   - Search criteria: older than 8 hours and match .cache/recording-jobs/[cache-|download-|live-|recording-]*.json
    //       - For each file selected for deletion, check if the finalOutputFile exists
    // 4. work dir, example:
    //   - public/videos/recordings/download-250523T205521-471517.mkv.log
    //   - public/videos/recordings/download-250523T205521-471517.mkv.part
    //   - public/videos/recordings/download-250523T205521-471517.mkv.status
    //   - public/videos/recordings/recording-250513T201125-64374.mp4.log
    // 4. media dir, example:
    //   - public/videos/media/4k-a_-_the_big_cigar_2024_s01_e06.mkv.json
    //   - Search criteria: older than 8 hours and match public/videos/media/*.json

    // probably It would be best to create atleast 4 separate functions for each of these directories
    // and porbably we should create helper functions that accept a RecordingJob or DownloadJob and delete associated files without question

    const maxAgeMs = force ? 0 : appConfig.minCleanupAgeMs;
    const cutoffDate = new Date(Date.now() - maxAgeMs);
    console.log(`🧹 Cleaning up old dangling jobs older than ${maxAgeMs / (1000 * 60)} minutes...`);
    console.log(`    - Files before ${cutoffDate.toLocaleString()}) will be deleted.`);

    await Promise.all([
        cleanOldCacheFiles(maxAgeMs),
        cleanOldJobInfoFiles(maxAgeMs),
        cleanOrphanedWorkFiles(maxAgeMs),
        cleanOrphanedMediaJson(maxAgeMs),
    ]);
}

export async function findJobsToCleanup(force = false): Promise<CleanupCandidate[]> {
    const jobDir = getJobsDir();
    const now = Date.now();
    const MIN_CLEANUP_AGE_MS = appConfig.minCleanupAgeMs; // 8 hours

    const files = (await fs.readdir(jobDir)).filter((f) => f.endsWith(".json") && !f.includes("-info"));
    const result: CleanupCandidate[] = [];

    for (const file of files) {
        const filePath = path.join(jobDir, file);
        const job = await readJsonFile<RecordingJob | DownloadJob>(filePath);
        const infoPath = path.join(jobDir, `${job.recordingId}-info.json`);
        const finalPath = job.finalOutputFile;
        const age = now - (await fs.stat(filePath)).mtimeMs;

        if (!force && (await fileExists(infoPath)) && (await fileExists(finalPath))) continue;
        if (age < MIN_CLEANUP_AGE_MS && !force) continue;

        const status = await readJobStatusFile(job.statusFile);
        const state = normalizeStatus(getLatestStatus(status.STATUS));
        const pidAlive = await isProcessAlive(parseInt(getLatestStatus(status.PID) || "0", 10));

        if (!(await fileExists(infoPath)) && !(await fileExists(finalPath))) {
            result.push({ job, reason: "ghost", fullPath: filePath });
        } else if (!pidAlive && !["done", "stopped", "error"].includes(state)) {
            result.push({ job, reason: "zombie", fullPath: filePath });
        } else if (["done", "stopped", "error"].includes(state)) {
            result.push({ job, reason: "done", fullPath: filePath });
        } else if (force) {
            result.push({ job, reason: "forced", fullPath: filePath });
        }
    }

    return result;
}

export async function deleteJobCompletely(job: RecordingJob | DownloadJob): Promise<void> {
    const isDownload = "url" in job;

    // Delete main job file (and .cache if needed)
    if (isDownload) {
        console.log(`🗑️ deleteDownloadJob(${job.recordingId}, true);`); // TODO: remove line
        await deleteDownloadJob(job.recordingId, true);
    } else {
        console.log(`🗑️ deleteRecordingJob(${job.recordingId}, true);`); //TODO: remove line
        await deleteRecordingJob(job.recordingId, true);
    }

    // Delete additional artifacts (logs, part, hls dir, info bundles, etc.)
    const extras = getExtraJobArtifacts(job, true);

    for (const file of extras) {
        if (await fileExists(file)) {
            if (fsSync.statSync(file).isDirectory()) {
                console.log(`🧨 Deleting directory (${file}`); // TODO: remove line
                await fs.rm(file, { recursive: true, force: true });
            } else {
                console.log(`🧨🧨 file (${file}`); // TODO: remove line
                await deleteFileAndForget(file);
            }
        }
    }
}

export async function cleanupFinishedJobs(force: boolean = false): Promise<void> {
    const jobs = await findJobsToCleanup(force);
    if (jobs.length === 0) {
        return;
    }

    // Make sure we do not delete scheduled jobs

    const enrichedJobs = await expandAllJobs();

    for (const { job, reason, fullPath } of jobs) {
        console.log(`🧹 Cleaning up job ${job.recordingId} due to: ${reason}`);
        // make sure we do not delete jobs that are still scheduled
        if (enrichedJobs.some((j) => j.cacheKey === job.cacheKey)) {
            console.log(`⚠️ Skipping job ${job.recordingId} because it is still scheduled.`);
            continue;
        }

        await deleteJobCompletely(job);

        // if delteJobCompletely did not delete the job file it self, we delete it here

        if (await fileExists(fullPath)) {
            console.log(`🗑️ Deleting job file: ${fullPath}`);
            await deleteFileAndForget(fullPath);
        }
    }

    deleteOldDanglingJobs();
}

function getExtraJobArtifacts(job: RecordingJob | DownloadJob, skipMediaInfo: boolean = true): string[] {
    const paths: string[] = [];
    if (job.logFile) paths.push(job.logFile);
    if (job.statusFile) paths.push(job.statusFile);
    if (job.outputFile && job.outputFile !== job.finalOutputFile) paths.push(job.outputFile);

    if (!fsSync.existsSync(job.finalOutputFile) || !skipMediaInfo) {
        paths.push(`${job.finalOutputFile}.json`); //we will always delete if finalOutputFile does not exist
    }
    paths.push(path.join(getJobsDir(), `${job.recordingId}-info.json`));
    paths.push(`${job.finalOutputFile}.part`);

    const workDir = getWorkDir();
    const workFiles = fsSync.readdirSync(workDir);
    for (const f of workFiles) {
        if (f.startsWith(job.recordingId) && f.endsWith("_hls")) {
            paths.push(path.join(workDir, f));
        }
    }

    return paths;
}
