// src/types/RecordingJob.ts

export interface RecordingJob {
    recordingId: string;         // e.g., "recording-240417T102405-176090"
    cacheKey: string;            // the original cache key
    user: string;                // email of the user who initiated the job
    outputFile: string;          // full path to .mp4
    logFile: string;             // full path to .log
    statusFile: string;          // full path to .status
    duration: number;            // duration in seconds
    format: string;              // currently always "mp4"
    startTime: string;           // actual start time (ISO)
    createdAt: string;           // when the job metadata was written
    recordingType: string;       // Type of recording can be ts or hls that results in .ts or .m3u8 recordings
  }
  