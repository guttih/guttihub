import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { DownloadJob } from "@/types/DownloadJob";
import { RecordingJob } from "@/types/RecordingJob";
import { RecordingJobInfo } from "@/types/RecordingJobInfo";

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

export async function ensureDownloadJobsDir(): Promise<void> {
    await fs.mkdir(getDownloadJobsDir(), { recursive: true });
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
        console.error("❌ Failed to read or parse JSON file:", filePath, err);
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

export function deleteFileAndForget(filePath: string) { 
    try {
        fs.unlink(filePath);
    } catch {
        // Ignore errors
    }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, content, "utf-8");
}

export async function ensureRecordingJobsDir(): Promise<void> {
    const dir = path.resolve(getCacheDir(), "recording-jobs");
    await fs.mkdir(dir, { recursive: true });
}

export function getRecordingJobsDir(): string {
    return path.join(getCacheDir(), "recording-jobs");
}

export function getDownloadJobsDir(): string {
     return getRecordingJobsDir();
    //return path.join(getCacheDir(), "downloading-jobs");
}

  // Build the path to the bundle
  export function getInfoJsonPath(id: string): string {
    return path.join(getRecordingJobsDir(), `${id}-info.json`);
  }
  
  // Read the finished-job bundle
  export async function readRecordingJobInfo(id: string): Promise<RecordingJobInfo> {
    const p = getInfoJsonPath(id);
    const txt = await fs.readFile(p, "utf-8");
    return JSON.parse(txt) as RecordingJobInfo;
  }
  
  // Probe whether the bundle exists
  export function infoJsonExists(id: string): boolean {
    return existsSync(getInfoJsonPath(id));
  }
  
  // Read a .status or .log by raw path
  export async function readFileRaw(p: string): Promise<string> {
    return fs.readFile(p, "utf-8");
  }

export async function writeRecordingJobFile(job: RecordingJob): Promise<void> {
    const dir = getRecordingJobsDir();
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${job.cacheKey}.json`);
    await writeJsonFile(filePath, job);
}
export async function readRecordingJobFile(cacheKey: string): Promise<RecordingJob> {

    const dir = getRecordingJobsDir();
    const filePath = path.join(dir, `${cacheKey}.json`);
    return await readJsonFile<RecordingJob>(filePath);
}

export async function readDownloadJobFile(cacheKey: string): Promise<DownloadJob> {

    const dir = getDownloadJobsDir();
    const filePath = path.join(dir, `${cacheKey}.json`);
    return await readJsonFile<DownloadJob>(filePath);
}

export async function writeDownloadingJobFile(job: DownloadJob): Promise<void> {
    const dir = getDownloadJobsDir();
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${job.cacheKey}.json`);
    await writeJsonFile(filePath, job);
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


