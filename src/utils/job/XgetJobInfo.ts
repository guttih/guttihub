// src/utils/job/XgetJobInfo.ts

import { Job } from "@/types/Job";
import { DownloadJobInfo, RecordingJobInfo } from "@/types/JobInfo";

import { XreadDownloadJob, XreadRecordingJob } from "./XjobFileService";
import { readFile } from "@/utils/fileHandler";
import { infoJsonExists, readRecordingJobInfo, readDownloadJobInfo } from "@/utils/fileHandler"; // or refactor into own helpers
import { parseLog, XparseFullStatus } from "./XjobStatusHelpers";
import { XgetJobType, XisDownloadJob, XisRecordingJob } from "./XjobClassifier";

export async function XgetJobInfo(job: Job): Promise<DownloadJobInfo | RecordingJobInfo> {
    const [logText, statusText] = await Promise.all([readFile(job.logFile), readFile(job.statusFile)]);

    const logs = parseLog(logText);
    const status = XparseFullStatus(statusText);
    const entry = job.entry;

    switch (XgetJobType(job)) {
        case "download": {
            if (!XisDownloadJob(job)) throw new Error("Invalid job type");
            return {
                job,
                entry,
                logs,
                status,
            } satisfies DownloadJobInfo;
        }

        case "recording": {
            if (!XisRecordingJob(job)) throw new Error("Invalid job type");
            return {
                job,
                entry,
                logs,
                status,
            } satisfies RecordingJobInfo;
        }

        default:
            throw new Error(`XgetJobInfo: unsupported job type`);
    }
}

/**
 * Gets a DownloadJobInfo using either recordingId or cacheKey.
 */
export async function XgetDownloadJobInfo(recordingId: string | null, cacheKey: string | null): Promise<DownloadJobInfo> {
    if (recordingId && infoJsonExists(recordingId)) {
        return await readDownloadJobInfo(recordingId);
    }

    if (!cacheKey) throw new Error("Missing cacheKey for download job info");

    const job = await XreadDownloadJob(cacheKey);
    return (await XgetJobInfo(job)) as DownloadJobInfo;
}

/**
 * Gets a RecordingJobInfo using either recordingId or cacheKey.
 */
export async function XgetRecordingJobInfo(recordingId: string | null, cacheKey: string | null): Promise<RecordingJobInfo> {
    if (recordingId && infoJsonExists(recordingId)) {
        return await readRecordingJobInfo(recordingId);
    }

    if (!cacheKey) throw new Error("Missing cacheKey for recording job info");

    const job = await XreadRecordingJob(cacheKey);
    const [logText, statusText, entry] = await Promise.all([
        readFile(job.logFile),
        readFile(job.statusFile),
        XreadRecordingJob(`recording-${job.cacheKey}`).then((j) => j.entry), // legacy fallback
    ]);

    return {
        job,
        entry: entry!,
        logs: parseLog(logText),
        status: XparseFullStatus(statusText),
    };
}
