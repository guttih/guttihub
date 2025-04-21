import { readRecordingJobFile } from "@/utils/fileHandler";

const VIEWER_TIMEOUT_MS = 15_000;

type ViewerMap = Map<string, Map<string, number>>; // recordingId -> (ip -> timestamp)

const viewers: ViewerMap = new Map();

export function trackViewer(recordingId: string, ip: string) {
    if (!viewers.has(recordingId)) viewers.set(recordingId, new Map());
    const entry = viewers.get(recordingId)!;
    entry.set(ip, Date.now());
}

export function getViewerCount(recordingId: string): number {
    cleanupOldViewers(recordingId);
    return viewers.get(recordingId)?.size || 0;
}

function cleanupOldViewers(recordingId: string) {
    const now = Date.now();
    const entry = viewers.get(recordingId);
    if (!entry) return;
    for (const [ip, timestamp] of entry.entries()) {
        if (now - timestamp > VIEWER_TIMEOUT_MS) {
            entry.delete(ip);
        }
    }
    if (entry.size === 0) {
        viewers.delete(recordingId);
    }
}

export async function shouldAutoStop(recordingId: string): Promise<boolean> {
    try {
        const job = await readRecordingJobFile(recordingId);
        return job?.format === "hls-live";
    } catch {
        return false;
    }
}

export function listActiveStreams(): string[] {
    return [...viewers.keys()].filter((id) => getViewerCount(id) > 0);
  }
  

  export function resetViewers(recordingId: string) {
    viewers.delete(recordingId);
  }
  