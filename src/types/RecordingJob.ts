// src/types/RecordingJob.ts

import { M3UEntry } from "@/types/M3UEntry";

export interface RecordingJob {
    recordingId: string;         // e.g., "recording-240417T102405-176090"
    cacheKey: string;            // the original cache key
    user: string;                // email of the user who initiated the job
    outputFile: string;          // full path to .mp4
    logFile: string;             // full path to .log
    statusFile: string;          // full path to .status
    finalOutputFile: string;    // full path to the final .mp4 (after download)
    duration: number;            // duration in seconds
    format: string;              // currently always "mp4"
    recordingType: string;       // Type of recording can be ts or hls that results in .ts or .m3u8 recordings
    startTime: string;           // actual start time (ISO)
    createdAt: string;           // when the job metadata was written
    entry: M3UEntry;             // M3U entry object
  }
  