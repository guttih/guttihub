// src/types/Job.ts

import type { RecordingJob } from "./RecordingJob";
import type { DownloadJob } from "./DownloadJob";
import type { MovieJob } from "./MovieJob";

export type Job = RecordingJob | DownloadJob | MovieJob;

export function isDownloadJob(job: Job): job is DownloadJob {
    return "url" in job;
}

export function isMovieJob(job: Job): job is MovieJob {
    return job.recordingType === "movie";
}

export function isRecordingJob(job: Job): job is RecordingJob {
    return !isDownloadJob(job) && !isMovieJob(job);
}
