// src/types/ScheduleRecordingParams.ts

import { M3UEntry } from "@/types/M3UEntry";

export interface ScheduleRecordingParams {
  cacheKey: string;
  entry: M3UEntry;
  // startTime: string; // for scheduled jobs (later)
  durationSec: number;
  user: string;
  outputFile: string;
  recordNow?: boolean;
}