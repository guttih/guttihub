// src/utils/job/XjobFinalizer.ts

import fs from "fs/promises";
import path from "path";
import * as fsSync from "fs";

import { fileExists, writeJsonFile, deleteFileAndForget } from "@/utils/fileHandler";
import { getJobsDir } from "@/utils/fileHandler";
import { getHumanReadableTimestamp } from "@/utils/resolverUtils";

import { Job } from "@/types/Job";
import { RecordingJob } from "@/types/RecordingJob";
import { readJobLogFile } from "@/utils/resolverUtils";
import { XreadJobStatusFile } from "./XjobStatusHelpers";
import { XisDownloadJob, XisRecordingJob } from "./XjobClassifier";

export async function XfinalizeJob(job: Job): Promise<boolean> {
    const { logs, status } = await XloadJobMeta(job);

    // Rename finalOutputFile if it already exists
    if (await fileExists(job.finalOutputFile)) {
        const timestamp = getHumanReadableTimestamp();
        const ext = path.extname(job.finalOutputFile);
        const base = path.basename(job.finalOutputFile, ext);
        const dir = path.dirname(job.finalOutputFile);
        job.finalOutputFile = path.join(dir, `${base}-${timestamp}${ext}`);
    }

    // Move file to final location (if not already there)
    if (job.outputFile !== job.finalOutputFile) {
        await fs.rename(job.outputFile, job.finalOutputFile);
        console.log(`✅ Moved ${job.outputFile} → ${job.finalOutputFile}`);
    }

    const info = { job, logs, status };

    const infoJson = path.join(getJobsDir(), `${job.recordingId}-info.json`);
    const mediaJson = `${job.finalOutputFile}.json`;

    await writeJsonFile(infoJson, info);
    await writeJsonFile(mediaJson, info);

    await XdeleteJobArtifacts(job);

    return true;
}

export async function XprocessFinishedRecording(job: RecordingJob): Promise<void> {
    const { logs, status } = await XloadJobMeta(job);

    const info = { job, logs, status };
    const infoPath = path.join(getJobsDir(), `${job.recordingId}-info.json`);

    await writeJsonFile(infoPath, info);

    const removeCache = job.format === "hls-live";
    await XdeleteJobArtifacts(job, removeCache);
}

// export async function XprocessFinishedDownload(job: DownloadJob): Promise<void> {
//     const { logs, status } = await XloadJobMeta(job);
//     const info = { job, logs, status };

//     const infoPath = path.join(getJobsDir(), `${job.recordingId}-info.json`);
//     await writeJsonFile(infoPath, info);

//     await XdeleteJobArtifacts(job, true);
// }

export async function XloadJobMeta(job: Job): Promise<{ logs: string[]; status: Record<string, string | string[]> }> {
    const logs = await readJobLogFile(job.logFile);
    const status = await XreadJobStatusFile(job.statusFile);
    return { logs, status };
}

export async function XdeleteJobArtifacts(job: Job, removeCache: boolean = false): Promise<void> {
    if (XisDownloadJob(job) || XisRecordingJob(job)) {
        const jobPath = path.join(getJobsDir(), `${job.recordingId}.json`);
        if (await fileExists(jobPath)) {
            await deleteFileAndForget(jobPath);
        }

        if (removeCache) {
            const cachePath = path.join(getJobsDir(), `${job.cacheKey}.json`);
            if (await fileExists(cachePath)) {
                await deleteFileAndForget(cachePath);
            }
        }

        await Promise.all([
            deleteFileAndForget(job.logFile),
            deleteFileAndForget(job.statusFile),
            job.outputFile !== job.finalOutputFile ? deleteFileAndForget(job.outputFile) : null,
        ]);
    }
}
