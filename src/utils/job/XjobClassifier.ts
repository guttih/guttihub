// src/utils/job/XjobClassifier.ts

import { Job } from "@/types/Job";
import { DownloadJob } from "@/types/DownloadJob";
import { RecordingJob } from "@/types/RecordingJob";
import { MovieJob } from "@/types/MovieJob";

export type JobType = "download" | "recording" | "movie";

/**
 * Returns the job type as a string literal.
 */
export function XgetJobType(job: Job): JobType {
    if ("url" in job) return "download";
    if (job.recordingType === "movie") return "movie";
    return "recording";
}

/**
 * Type guard: is this a DownloadJob?
 */
export function XisDownloadJob(job: Job): job is DownloadJob {
    return "url" in job;
}

/**
 * Type guard: is this a MovieJob?
 */
export function XisMovieJob(job: Job): job is MovieJob {
    return job.recordingType === "movie";
}

/**
 * Type guard: is this a RecordingJob?
 */
export function XisRecordingJob(job: Job): job is RecordingJob {
    return !XisDownloadJob(job) && !XisMovieJob(job);
}
