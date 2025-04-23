// src/types/LiveParams.ts

import { M3UEntry } from "@/types/M3UEntry";

export interface LiveParams {
  cacheKey: string;
  entry: M3UEntry;
  startTime: string;
  user: string;
  outputFile: string;
}