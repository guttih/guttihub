// src/utils/job/jobFileService.ts

import path from "path";
import { promises as fs } from "fs";
import { getJobsDir, getCacheDir, writeJsonFile, readJsonFile, deleteFileAndForget, fileExists } from "@/utils/fileHandler";
import { RecordingJob } from "@/types/RecordingJob";
import { DownloadJob } from "@/types/DownloadJob";
import { Job } from "@/types/Job";

export async function XreadJobFile<T extends Job = Job>(cacheKey: string): Promise<T> {
    const filePath = path.join(getJobsDir(), `${cacheKey}.json`);
    return await readJsonFile<T>(filePath);
}

export async function XwriteJobFile<T extends Job>(job: T, deleteOldCache: boolean = false): Promise<void> {
    const jobsDir = getJobsDir();
    await fs.mkdir(jobsDir, { recursive: true });
    const jobPath = path.join(jobsDir, `${job.cacheKey}.json`);
    await writeJsonFile(jobPath, job);

    if (deleteOldCache) {
        const cachePath = path.join(getCacheDir(), `${job.cacheKey}.json`);
        await deleteFileAndForget(cachePath);
    }
}

export async function XdeleteJobFile<T extends Job>(job: T, removeCache: boolean = false): Promise<void> {
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
