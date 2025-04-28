// src/types/DownloadJob.ts

import { M3UEntry } from "@/types/M3UEntry";

export interface DownloadJob {
  recordingId: string;         // Friendly ID (like download-240428T1920-xxxxx)
  cacheKey: string;            // Original cacheKey (might be OUTPUT_FILE or true cache key)
  user: string;                // User who triggered
  outputFile: string;          // Full path to the .mp4 (.part during download)
  logFile: string;             // Full path to the .log
  statusFile: string;          // Full path to the .status
  startTime: string;           // When the download started
  createdAt: string;           // When the metadata was written
  url: string;                 // Original download URL
  entry: M3UEntry;             // 🧠 Full M3UEntry for friendly names, thumbnails, group info etc
  format: string;              
  recordingType: string;       
}
