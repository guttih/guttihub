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
    const baseUrl = process.env.BASE_URL; // Fetch the value of BASE_URL from environment variables
    if (!baseUrl) {
        throw new Error("BASE_URL environment variable is not set.");
    }
    return baseUrl;
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

/**
 * Read a recording’s .log file and return an array of non‑empty lines.
 */
export async function readJobLogFile(logPath: string): Promise<string[]> {
    try {
        if (!logPath) return [];
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
        if (!statusPath) return result;
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

/**
 * Perform the full “read, parse, bundle into info.json, cleanup” for one job.
 * Returns true if it was processed (i.e. not live).
 */
export async function processFinishedRecording(job: RecordingJob): Promise<boolean> {
    // you’ll still need getEntryByCacheKey and deleteRecordingJob imported where it lives
    const logs = await readJobLogFile(job.logFile);
    const status = await readJobStatusFile(job.statusFile);

    // assemble and write the -info.json
    const info = { job, logs, status };
    const infoPath = path.join(getJobsDir(), `${job.recordingId}-info.json`);
    await writeJsonFile(infoPath, info);

    // now clean up
    await deleteRecordingJob(job.recordingId, true);
    // drop any leftover files quietly
    await Promise.all([job.logFile, job.statusFile].map((p) => fs.unlink(p).catch(() => {})));
    return true;
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
        fsSync.unlinkSync(jobFilePath);
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
        fsSync.unlinkSync(jobFilePath);
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
    await Promise.all([job.logFile, job.statusFile].map((p) => fs.unlink(p).catch(() => {})));
    return true;
}

export async function cleanupFinishedJobs(options: { force?: boolean } = {}): Promise<void> {
    const { force = false } = options;

    // Step 1: Clean orphaned .cache JSONs (ghost files)
    await cleanupGhostCacheFiles(force);

    const jobDir = getJobsDir();
    const files = await fs.readdir(jobDir);
    const now = Date.now();

    for (const file of files) {
        // Only consider job metadata JSONs, skip info bundles
        if (!file.endsWith(".json") || file.includes("-info")) continue;

        const filePath = path.join(jobDir, file);
        let job: RecordingJob | DownloadJob;

        try {
            job = await readJsonFile(filePath);
        } catch (e) {
            console.warn(`❌ Skipping unreadable job: ${file}`, e);
            continue;
        }

        // Read status and check process health
        const status = await readJobStatusFile(job.statusFile);
        const statusValue = normalizeStatus(getLatestStatus(status.STATUS));
        const pidRaw = getLatestStatus(status.PID);
        const pidAlive = pidRaw ? await isProcessAlive(parseInt(pidRaw, 10)) : false;

        const isDone = statusValue === "done";

        // We treat jobs as zombies if they claim to be in progress but no PID is alive
        const isZombie = (statusValue === "recording" || statusValue === "downloading" || statusValue === "live") && !pidAlive;

        // Add grace time of 10 minutes to maxExpected runtime
        const jobStart = new Date(job.startTime).getTime();
        const maxExpectedMs = "duration" in job ? (job.duration || 0) * 1000 : 0;
        const isStale = now > jobStart + maxExpectedMs + 10 * 60 * 1000;

        const isRecording = job.recordingType === "hls";

        if (isDone) {
            if (isRecording) {
                await processFinishedRecording(job as RecordingJob);
            } else {
                await processFinishedDownload(job as DownloadJob);
            }
        } else if (isZombie || isStale) {
            console.warn(`🧟 Deleting zombie/stale job: ${job.recordingId} (${statusValue})`);

            // Extra cleanup if it's HLS (which creates directories and playlists)
            if (job.recordingType === "hls") {
                deleteFileAndForget(job.outputFile + ".m3u8");
                await fs.rm(job.outputFile + "_hls", { recursive: true, force: true }).catch(() => {});
            }

            // Remove output, log, and status files
            deleteFileAndForget(job.outputFile);
            deleteFileAndForget(job.statusFile);
            deleteFileAndForget(job.logFile);

            if (isRecording) {
                await deleteRecordingJob(job.recordingId, true);
            } else {
                await deleteDownloadJob(job.recordingId, true);
            }
        } else {
            console.log(`💤 Skipping active job: ${job.recordingId} (${statusValue})`);
        }
    }
}

export async function cleanupGhostCacheFiles(force = false): Promise<void> {
    const cacheDir = getCacheDir();
    const jobDir = getJobsDir();

    const allFiles = await fs.readdir(cacheDir);
    const ghostCandidates = allFiles.filter((f) => f.startsWith("cache-") && f.endsWith(".json"));

    const activeJobFiles = await fs.readdir(jobDir);
    const usedCacheKeys = new Set<string>();
    for (const file of activeJobFiles) {
        if (!file.endsWith(".json") || file.includes("-info")) continue;
        const job = await readJsonFile<{ cacheKey: string }>(path.join(jobDir, file));
        if (job.cacheKey) {
            usedCacheKeys.add(job.cacheKey);
        }
    }

    const now = Date.now();
    const GHOST_TTL_MS = 5 * 60 * 60 * 1000; // 5 hours

    for (const filename of ghostCandidates) {
        const fullPath = path.join(cacheDir, filename);
        try {
            const stat = await fs.stat(fullPath);
            const age = now - stat.mtimeMs;

            const data = await readJsonFile<{ cacheKey?: string }>(fullPath);
            const cacheKey = data.cacheKey || filename.replace(".json", "");

            if (force || (age > GHOST_TTL_MS && !usedCacheKeys.has(cacheKey))) {
                console.warn(`👻 Deleting ghost cache file: ${filename} ${force ? "(forced)" : ""}`);
                deleteFileAndForget(fullPath);
            }
        } catch (err) {
            console.error(`❌ Failed to check or delete ghost: ${filename}`, err);
        }
    }
}

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
