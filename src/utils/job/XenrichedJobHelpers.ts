// src/utils/job/XenrichedJobHelpers.ts
import { StreamingServiceResolver } from "@/resolvers/StreamingServiceResolver";
import { XreadJobFile } from "@/utils/job/jobFileService";
import { readStatusFile } from "@/utils/fileHandler";
import { isProcessAlive } from "@/utils/process";
import { isDownloadJob, isMovieJob, isRecordingJob, Job } from "@/types/Job";
import { DownloadStatus } from "@/types/DownloadStatus";
import { EnrichedJob } from "@/types/EnrichedJob";
import { RecordingJob } from "@/types/RecordingJob";
import { DownloadJob } from "@/types/DownloadJob";
import { MovieJob } from "@/types/MovieJob";
import { M3UEntry } from "@/types/M3UEntry";
import { readDownloadJobFile } from "@/utils/fileHandler"; // legacy fallback for now
import { XreadCachedEntry } from "@/utils/job/XreadCachedEntry";
/**
 * Smart dispatcher for enriching any known job type.
 */
export async function XenrichJob(job: Job): Promise<EnrichedJob | null> {
    if (!job) return null;

    if (isDownloadJob(job)) {
        const status = await XgetDownloadJobStatus(job);
        if (status) return await XenrichDownloadJob(status);
    }

    if (isMovieJob(job)) {
        return await XenrichMovieJob(job);
    }

    if (isRecordingJob(job)) {
        return await XenrichRecordingJob(job);
    }

    return null;
}

export async function XenrichMovieJob(job: MovieJob): Promise<EnrichedJob> {
    const entry: M3UEntry | null = job.entry || (await XreadCachedEntry(job.cacheKey));

    const resolver = new StreamingServiceResolver();
    const service = resolver.findById(job.recordingId);
    const serviceName = service?.name ?? "Unknown Service";

    return {
        recordingId: job.recordingId,
        cacheKey: job.cacheKey,
        format: job.format,
        recordingType: "movie",
        name: entry?.name ?? "Unknown Stream",
        groupTitle: entry?.groupTitle ?? "Unknown Group",
        startedAt: job.startTime,
        user: job.user,
        status: "playing",
        serviceName,
        tvgLogo: entry?.tvgLogo ?? "/fallback.png",
        duration: job.duration,
        finalOutputFile: job.finalOutputFile,
    };
}

export async function XenrichRecordingJob(job: RecordingJob): Promise<EnrichedJob> {
    const entry = job.entry || (await XreadCachedEntry(job.cacheKey));
    const status = await readStatusFile(job.statusFile);
    const pidAlive = status?.PID ? await isProcessAlive(parseInt(status.PID)) : false;

    let finalStatus = status?.STATUS ?? "unknown";
    if (finalStatus === "recording" && !pidAlive) {
        finalStatus = "error";
    }

    const resolver = new StreamingServiceResolver();
    const server = entry?.url ? StreamingServiceResolver.extractServerFromUrl(entry.url) : null;
    const service = server ? resolver.findByServer(server) : null;

    return {
        recordingId: job.recordingId,
        cacheKey: job.cacheKey,
        format: job.format,
        recordingType: "hls",
        name: entry?.name ?? "Unknown Stream",
        groupTitle: entry?.groupTitle ?? "Unknown Group",
        startedAt: job.startTime,
        user: job.user,
        status: finalStatus,
        serviceName: service?.name ?? "Unknown Service",
        tvgLogo: entry?.tvgLogo ?? "/fallback.png",
        duration: job.duration,
        finalOutputFile: job.finalOutputFile,
    };
}

export async function XenrichDownloadJob(status: DownloadStatus): Promise<EnrichedJob> {
    const job = await readDownloadJobFile(status.cacheKey); // Can be XreadJobFile if legacy removed

    const resolver = new StreamingServiceResolver();
    const server = job.entry?.url ? StreamingServiceResolver.extractServerFromUrl(job.entry.url) : null;
    const service = server ? resolver.findByServer(server) : null;

    return {
        recordingId: job.recordingId,
        cacheKey: job.cacheKey,
        format: job.format ?? "mp4",
        recordingType: "download",
        name: job.entry?.name ?? "Unknown Download",
        groupTitle: job.entry?.groupTitle ?? "Download",
        startedAt: status?.STARTED_AT ?? new Date().toISOString(),
        user: job.user,
        status: status?.STATUS ?? "unknown",
        serviceName: service?.name ?? "Download Manager",
        tvgLogo: job.entry?.tvgLogo ?? "/download-icon.png",
        duration: 0, // Duration is not applicable for downloads
        finalOutputFile: job.finalOutputFile,
    };
}

export async function XgetDownloadJobStatus(job: DownloadJob): Promise<DownloadStatus | null> {
    if (!job.url || !job.statusFile) return null;

    try {
        const text = await readStatusFile(job.statusFile);
        const raw = typeof text === "string" ? parseSimpleKeyValue(text) : text;

        if (raw.STATUS === "downloading") {
            return {
                cacheKey: job.cacheKey,
                STATUS: raw.STATUS,
                STARTED_AT: raw.STARTED_AT,
                URL: raw.URL,
                OUTPUT_FILE: raw.OUTPUT_FILE,
                USER: raw.USER,
                PID: raw.PID,
            };
        }
    } catch {
        return null;
    }

    return null;
}

function parseSimpleKeyValue(text: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [key, ...rest] = trimmed.split("=");
        result[key] = rest.join("=");
    }
    return result;
}
