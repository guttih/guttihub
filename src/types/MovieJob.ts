// src/types/MovieJob.ts

import { M3UEntry } from "@/types/M3UEntry";

export interface MovieJob {
    recordingId: string; // Unique, like "movie-consumer-<id>"
    cacheKey: string;
    user: string;
    outputFile: string;
    logFile: string;
    statusFile: string;
    finalOutputFile: string;
    duration: number;
    format: string;
    recordingType: string;
    startTime: string;
    createdAt: string;
    entry: M3UEntry;
}
