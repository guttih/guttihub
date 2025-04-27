// src/types/ScheduleRecordingParams.ts

import { M3UEntry } from "@/types/M3UEntry";

export interface ScheduleRecordingParams {
  cacheKey: string;
  startTime?: string;
  durationSec: number;
  user: string;
  recordNow: boolean;
  entry: M3UEntry;
  location: string;
}