import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { DownloadJob } from "@/types/DownloadJob";
import { RecordingJob } from "@/types/RecordingJob";
import { RecordingJobInfo } from "@/types/RecordingJobInfo";
import { DownloadJobInfo } from "@/types/DownloadJobInfo";
import { outDirectories } from "@/config";
import { logger } from "./logger";

/**
 * Resolves an absolute path to a script inside src/scripts/
 * Works even in PM2 or production environments
 */
export function getScriptPath(scriptName: string): string {
    // Find root directory relative to the compiled dist (likely in .next or out)
    const rootDir = path.resolve(process.cwd());
    return path.join(rootDir, "src/scripts", scriptName);
}

const CACHE_DIR = path.resolve(process.cwd(), ".cache");

export function getCacheDir(): string {
    return CACHE_DIR;
}

export function getCacheFilePath(username: string, serviceName: string, extension: string): string {
    const safeService = serviceName.toLowerCase().replace(/\s+/g, "_");
    return path.join(CACHE_DIR, `${username}_${safeService}.${extension}`);
}

export async function ensureCacheDir(): Promise<void> {
    await fs.mkdir(CACHE_DIR, { recursive: true });
}

export async function ensureMediaDir(): Promise<void> {
    await fs.mkdir(getMediaDir(), { recursive: true });
}

export async function ensureDownloadJobsDir(): Promise<void> {
    await fs.mkdir(getJobsDir(), { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
    try {
        const data = await fs.readFile(filePath, "utf-8");
        return JSON.parse(data) as T;
    } catch (err) {
        // console.error("❌ Failed to read or parse JSON file:", filePath, err);
        throw err;
    }
}

export async function deleteFile(filePath: string): Promise<void> {
    try {
        await fs.unlink(filePath);
    } catch (err) {
        console.error("❌ Failed to delete file:", filePath, err);
        throw err;
    }
}

export function deleteFileAndForget(filePath: string): Promise<void> {
    if (filePath.endsWith(".mp4") || filePath.endsWith(".mkv")) {
        // If it's a media file, we don't want to delete it silently
        console.warn(`⚠️ Deleting media file ${filePath} silently is not recommended.`);
    }

    return fs.unlink(filePath).catch(() => {
        // Silently ignore all errors: ENOENT, EACCES, EPERM, etc.
    });
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, content, "utf-8");
}

export async function ensureRecordingJobsDir(): Promise<void> {
    const dir = path.resolve(getCacheDir(), "recording-jobs");
    await fs.mkdir(dir, { recursive: true });
}

export function getJobsDir(): string {
    return path.join(getCacheDir(), "recording-jobs");
}

// returns the directory where recordings and downloads are stored
// This directory could contain a lot of files, including files we did not create and have no info about
export function getMediaDir(): string {
    return outDirectories[1].path;
}

// returns the direcrtory ffmpeg uses to store its temporary files until the job is finished and the final file is moved to the media dir
export function getWorkDir(): string {
    return outDirectories[0].path;
}

// Build the path to the bundle
export function getInfoJsonPath(id: string): string {
    return path.join(getJobsDir(), `${id}-info.json`);
}

// Read the finished-recording-job bundle
export async function readRecordingJobInfo(id: string): Promise<RecordingJobInfo> {
    const p = getInfoJsonPath(id);
    const txt = await fs.readFile(p, "utf-8");
    return JSON.parse(txt) as RecordingJobInfo;
}

// Read the finished-download-job bundle
export async function readDownloadJobInfo(id: string): Promise<DownloadJobInfo> {
    const p = getInfoJsonPath(id);
    const txt = await fs.readFile(p, "utf-8");
    return JSON.parse(txt) as DownloadJobInfo;
}

// Probe whether the bundle exists
export function infoJsonExists(id: string): boolean {
    return existsSync(getInfoJsonPath(id));
}

// Read a .status or .log by raw path
export async function readFileRaw(p: string): Promise<string> {
    return fs.readFile(p, "utf-8");
}

// Write the finished-job bundle, and if deleteEntryCash is true,
// and a file with same name exists in the cache dir (not recording-jobs dir), delete it
export async function writeRecordingJobFile(job: RecordingJob, deleteEntryCash: boolean): Promise<void> {
    const dir = getJobsDir();
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${job.cacheKey}.json`);
    await writeJsonFile(filePath, job);
    if (deleteEntryCash) {
        const oldEntryfilePath = path.join(getCacheDir(), `${job.cacheKey}.json`);
        deleteFileAndForget(oldEntryfilePath);
    }
}
export async function readRecordingJobFile(cacheKey: string): Promise<RecordingJob> {
    const filePath = path.join(getJobsDir(), `${cacheKey}.json`);
    return await readJsonFile<RecordingJob>(filePath);
}

export async function readDownloadJobFile(cacheKey: string): Promise<DownloadJob> {
    const filePath = path.join(getJobsDir(), `${cacheKey}.json`);
    return await readJsonFile<DownloadJob>(filePath);
}

export async function writeDownloadingJobFile(job: DownloadJob, deleteEntryCash: boolean): Promise<void> {
    const dir = getJobsDir();
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${job.cacheKey}.json`);
    await writeJsonFile(filePath, job);
    if (deleteEntryCash) {
        const oldEntryfilePath = path.join(getCacheDir(), `${job.cacheKey}.json`);
        deleteFileAndForget(oldEntryfilePath);
    }
}

export async function readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, "utf-8");
}

export async function writeFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, "utf-8");
}

export async function renameFile(oldPath: string, newPath: string): Promise<void> {
    try {
        await fs.rename(oldPath, newPath);
    } catch (error) {
        console.error(`❌ Error renaming file from ${oldPath} to ${newPath}:`, error);
        throw error;
    }
}

export async function isFileFresh(filePath: string, maxAgeMs: number): Promise<boolean> {
    try {
        const stat = await fs.stat(filePath);
        return Date.now() - stat.mtimeMs < maxAgeMs;
    } catch {
        return false;
    }
}

export async function readStatusFile(filePath: string): Promise<Record<string, string>> {
    try {
        const raw = await readFile(filePath);
        const lines = raw.split("\n");
        const obj: Record<string, string> = {};
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;
            const [key, ...valueParts] = trimmed.split("=");
            if (key && valueParts.length > 0) {
                obj[key] = valueParts.join("="); // allow '=' in values
            }
        }
        return obj;
    } catch (err) {
        console.warn(`⚠️ readStatusFile(${filePath}) failed`, err);
        return {}; // <– instead of throwing error, we return empty object
    }
}

export function log(message: string) {
    const now = new Date();
    const hhmmss = now.toTimeString().slice(0, 8).replace(/:/g, "");
    logger.info(`[${hhmmss}] ${message}`);
}
