// src/types/RecordingJobInfo.ts
import { RecordingJob } from "./RecordingJob";
import { M3UEntry } from "./M3UEntry";

/**
 * Everything you need to display a finished (or errored) recording:
 *
 * - `job`:    the metadata you wrote out originally
 * - `entry`:  the M3UEntry (channel info, stream URL, etc.)
 * - `logs`:   raw log lines
 * - `status`: full parsed status file (arrays if keys repeat)
 */
export interface RecordingJobInfo {
  job: RecordingJob;
  entry: M3UEntry;
  logs: string[];
  status: Record<string, string | string[]>;
}
