// src/utils/job/XjobFileService.ts

import path from "path";
import { promises as fs } from "fs";
import { getJobsDir, getCacheDir, writeJsonFile, readJsonFile, deleteFileAndForget, fileExists } from "@/utils/fileHandler";
import { RecordingJob } from "@/types/RecordingJob";
import { DownloadJob } from "@/types/DownloadJob";
import { Job } from "@/types/Job";
import { XisDownloadJob } from "./XjobClassifier";

/** Generic job read */
export async function XreadJobFile<T extends Job = Job>(cacheKey: string): Promise<T> {
    const filePath = path.join(getJobsDir(), `${cacheKey}.json`);
    return await readJsonFile<T>(filePath);
}

/** Generic job write */
export async function XwriteJobFile<T extends Job>(job: T, deleteOldCache = false): Promise<void> {
    const jobPath = path.join(getJobsDir(), `${job.cacheKey}.json`);
    await fs.mkdir(getJobsDir(), { recursive: true });
    await writeJsonFile(jobPath, job);

    if (deleteOldCache) {
        const cachePath = path.join(getCacheDir(), `${job.cacheKey}.json`);
        await deleteFileAndForget(cachePath);
    }
}

/** Generic job delete */
export async function XdeleteJobFile<T extends Job>(job: T, removeCache = false): Promise<void> {
    const jobPath = path.join(getJobsDir(), `${job.recordingId}.json`);
    if (await fileExists(jobPath)) {
        await deleteFileAndForget(jobPath);
    }

    if (removeCache) {
        const cachePath = path.join(getCacheDir(), `${job.cacheKey}.json`);
        if (await fileExists(cachePath)) {
            await deleteFileAndForget(cachePath);
        }
    }
}

/** Drop-in compatibility helpers */
export const XreadDownloadJob = (key: string): Promise<DownloadJob> => XreadJobFile<DownloadJob>(key);
export const XreadRecordingJob = (key: string): Promise<RecordingJob> => XreadJobFile<RecordingJob>(key);
