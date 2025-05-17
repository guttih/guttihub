// src/types/EnrichedJob.ts
export interface EnrichedJob {
    recordingId: string;
    cacheKey: string;
    format: string;
    recordingType: string;
    name: string;
    groupTitle: string;
    startedAt: string;
    user: string;
    status: string;
    serviceName: string;
    tvgLogo: string;
    duration: number;
    finalOutputFile?: string;
}
