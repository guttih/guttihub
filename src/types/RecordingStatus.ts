// src/types/RecordingStatus.ts

export interface RecordingStatus {
    status: "recording" | "live" | "done" | "error" | "unknown";
    startedAt?: string;
    expectedStop?: string;
    stream?: string;
    user?: string;
    duration?: string;
    outputFile?: string;
    logFile?: string;
    serverTime?: string;
  }
  