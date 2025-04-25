// src/types/JobctlParsedMeta.ts

import { M3UEntry } from "@/types/M3UEntry";

export interface JobctlParsedMeta {
  cacheKey?: string;
  duration?: number;
  outputFile?: string;
  url?: string;
  user?: string;
  recordingType?: string;
  format?: string;
    
}

export interface JobctlEnrichedScheduledJob extends JobctlParsedMeta {
  systemJobId: string;
  datetime: string;
  description: string;
  command: string;
  entry?: M3UEntry;
}
