import type { M3UEntry } from "./M3UEntry";

export type QueueStatus = "queued" | "downloading" | "completed" | "failed" | "cancelled";
export interface DownloadQueueItem {
    id: string;
    entry: M3UEntry;
    serviceId: string;
    user: string;
    createdAt: string;
    status: QueueStatus;
    cacheKey: string;
    recordingId?: string;
    finalFileName?: string;
    startedAt?: string;
    cancelRequested?: boolean;
    error?: string;
    progressPercent?: number;
}
export interface DownloadQueueState {
    running: boolean;
    items: DownloadQueueItem[];
}
export type QueueAction = "start" | "pause" | "remove" | "retry" | "cancel" | "moveUp" | "moveDown";
