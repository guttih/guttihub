// src/types/JobInfo.ts

import { M3UEntry } from "@/types/M3UEntry";
import { Job } from "@/types/Job";
import { RecordingJob } from "@/types/RecordingJob";
import { DownloadJob } from "@/types/DownloadJob";

/**
 * Generic structure representing the full resolved view of a job,
 * including metadata, channel info, logs, and parsed status.
 *
 * Used for displaying or managing jobs after they’ve started or finished.
 *
 * - `job`:    The full job metadata (RecordingJob, DownloadJob, etc.)
 * - `entry`:  The stream/channel entry used for display (logo, name, etc.)
 * - `logs`:   The parsed log lines from the job’s .log file
 * - `status`: The parsed .status file as a key-value map (handles repeated keys)
 */
export interface JobInfo<T extends Job> {
    job: T;
    entry: M3UEntry;
    logs: string[];
    status: Record<string, string | string[]>;
}

// 💡 Type aliases for clarity and backward compatibility:
export type RecordingJobInfo = JobInfo<RecordingJob>;
export type DownloadJobInfo = JobInfo<DownloadJob>;
