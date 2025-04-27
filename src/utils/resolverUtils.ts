// src/utils/resolverUtils.ts

import fs from "fs/promises";
import * as fsSync from "fs"; //todo: we should only use fs/promises I think
import path from "path";
import { readRecordingJobFile, readRecordingJobInfo, infoJsonExists, readFileRaw, getRecordingJobsDir } from "@/utils/fileHandler";
import { getCacheDir, readJsonFile, writeJsonFile } from "@/utils/fileHandler";
import { RecordingJob } from "@/types/RecordingJob";
import { RecordingJobInfo } from "@/types/RecordingJobInfo";
import { getActiveLiveJobs } from "@/utils/record/recordingJobUtils";

export function buildRecordingId(prefix:string, date: Date, url: string,  extension: string | null = null ): string {
    const dateStr = date.toISOString().slice(2, 19).replace(/[-:]/g, "").replace("T", "T");
    const streamId = url.trim().split("/").filter(Boolean).pop() ?? "unknown";
    const ext =
        extension && extension.trim() !== "" && extension.startsWith(".") ? extension : extension && extension.trim() !== "" ? `.${extension}` : "";
        const fileName = `${prefix}${dateStr}-${streamId}${ext}`;
    return fileName;
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
export async function readRecordingLogFile(logPath: string): Promise<string[]> {
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
export async function readRecordingStatusFile(statusPath: string): Promise<Record<string, string | string[]>> {
    const result: Record<string, string | string[]> = {};
    try {
        if (!statusPath) return result
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
    const logs = await readRecordingLogFile(job.logFile);
    const status = await readRecordingStatusFile(job.statusFile);

    // assemble and write the -info.json
    const info = { job, logs, status };
    const infoPath = path.join(getRecordingJobsDir(), `${job.recordingId}-info.json`);
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
    const jobDir = getRecordingJobsDir();
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
        const status = await readRecordingStatusFile(job.statusFile);
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

export async function getRecordingJobInfo(cacheKey: string|null, recordingId: string|null): Promise<RecordingJobInfo> {
    if (recordingId && infoJsonExists(recordingId)) {
        return await readRecordingJobInfo(recordingId);
    }

    if (!cacheKey) {
        throw new Error("Missing cacheKey");
    }
    const job = await readRecordingJobFile(cacheKey);
    const [logText, statusText, entry] = await Promise.all([readFileRaw(job.logFile), readFileRaw(job.statusFile), (await readRecordingJobFile(`recording-${job.cacheKey}`)).entry]);
    return {
        job,
        entry: entry!,
        logs: parseLog(logText),
        status: parseStatus(statusText),
    };
}

/**
 * Looks up the recordingId that matches the given cacheKey.
 */
export async function getRecordingIdByCacheKey(cacheKey: string): Promise<string | null> {
    const dir = getRecordingJobsDir();
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

// src/utils/resolverUtils.ts

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
    const jobFilePath = path.join(getRecordingJobsDir(), `${recordingId}.json`);
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

// src/utils/resolverUtils.ts
export function normalizeStatus(raw: string): "recording" | "done" | "error" | "unknown" {
    const s = raw.toLowerCase();
    if (s.includes("error")) return "error";
    if (s.includes("live") || s.includes("recording")) return "recording";
    if (s.includes("packaging") && s.includes("done")) return "done";
    if (s === "done") return "done";
    return "unknown";
}
export function humanizeStatus(raw: string): string {
    switch (normalizeStatus(raw)) {
        case "recording":
            return "Recording";
        case "done":
            return "Done";
        case "error":
            return "Error";
        case "unknown":
            return "Unknown";
    }
}
