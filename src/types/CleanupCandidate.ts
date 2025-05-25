// src/types/CleanupCandidate.ts

import { RecordingJob } from "@/types/RecordingJob";
import { DownloadJob } from "@/types/DownloadJob";

export type CleanupCandidate = {
    job: RecordingJob | DownloadJob;
    reason: "ghost" | "zombie" | "done" | "forced";
    fullPath: string;
};
