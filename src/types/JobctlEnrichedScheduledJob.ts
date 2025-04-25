// src/types/EnrichedScheduledJob.ts
import { M3UEntry } from "./M3UEntry";

export interface JobctlEnrichedScheduledJob {
  systemJobId: string;
  datetime: string;
  description: string;
  command: string;
  duration: number;
  user: string;
  cacheKey: string;
  outputFile: string;
  recordingType: string;
  format: string;
  entry?: M3UEntry; // optional because it depends on the cacheKey file existing
}

