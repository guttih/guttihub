// src/types/LiveParams.ts

import { M3UEntry } from "@/types/M3UEntry";

export interface LiveParams {
  cacheKey: string;
  entry: M3UEntry;
  location: string;
}