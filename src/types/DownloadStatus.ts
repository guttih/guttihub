// src/types/DownloadStatus.ts 
export interface DownloadStatus {
    STATUS: string;
    STARTED_AT: string;
    URL: string;
    OUTPUT_FILE: string;
    USER: string;
    PID: string;
    EXTRA_FIELDS?: Record<string, string>; // 👈 optional clean extension
  }