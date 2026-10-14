import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { withQueue } from "./queueStore";
import { DownloadResolver } from "@/resolvers/DownloadResolver";
import { StreamingServiceResolver } from "@/resolvers/StreamingServiceResolver";
import { getActiveLiveJobs } from "@/utils/record/recordingJobUtils";
import { readDownloadJobFile, readDownloadJobInfo } from "@/utils/fileHandler";
import { finalizeJobStart, parseLatestStatus } from "@/utils/resolverUtils";
import { extractLatestDownloadProgressPercent } from "@/utils/downloadStatusParser";
import type { DownloadQueueItem, QueueAction } from "@/types/DownloadQueue";
import type { M3UEntry } from "@/types/M3UEntry";

export async function addToQueue(entry: M3UEntry, serviceId: string, user: string) {
    const service = new StreamingServiceResolver().findById(serviceId);
    if (!service || new StreamingServiceResolver().findByViewingUrl(entry.url)?.id !== serviceId) {
        throw new Error("Select media from a configured streaming service");
    }
    const url = new URL(entry.url);
    if (!["http:", "https:"].includes(url.protocol) || !/\.(mp4|mkv|ts)$/i.test(url.pathname)) {
        throw new Error("Only MP4, MKV and TS files can be queued");
    }
    return withQueue(async (state, save) => {
        const existing = state.items.find((item) => item.entry.url === entry.url && ["queued", "downloading", "completed"].includes(item.status));
        if (existing) return existing.id;
        const id = randomUUID();
        state.items.push({ id, entry, serviceId, user, createdAt: new Date().toISOString(), status: "queued", cacheKey: `queue-${id}` });
        await save();
        return id;
    });
}

export async function changeQueue(action: QueueAction, id?: string) {
    return withQueue(async (state, save) => {
        if (action === "start") state.running = true;
        else if (action === "pause") state.running = false;
        else {
            const item = state.items.find((item) => item.id === id);
            if (!item) throw new Error("Download not found");
            if ((action === "moveUp" || action === "moveDown") && item.status === "queued") {
                const waiting = state.items.filter((row) => row.status === "queued");
                const index = waiting.indexOf(item);
                const neighbor = waiting[index + (action === "moveUp" ? -1 : 1)];
                if (neighbor) {
                    const from = state.items.indexOf(item);
                    const to = state.items.indexOf(neighbor);
                    [state.items[from], state.items[to]] = [state.items[to], state.items[from]];
                }
            } else if (action === "remove" && item.status !== "downloading") state.items = state.items.filter((row) => row.id !== id);
            else if (action === "retry" && ["failed", "cancelled"].includes(item.status)) {
                item.status = "queued";
                item.cacheKey = `queue-${randomUUID()}`;
                delete item.recordingId;
                delete item.finalFileName;
                delete item.startedAt;
                delete item.error;
                delete item.progressPercent;
                delete item.cancelRequested;
            } else if (action === "cancel" && item.status === "downloading") item.cancelRequested = true;
            else throw new Error("Action is not available for this download");
        }
        await save();
    });
}

async function reconcile(item: DownloadQueueItem) {
    const job = await readDownloadJobFile(item.cacheKey).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
        return null;
    });
    if (!job) {
        if (Date.now() - Date.parse(item.startedAt!) > 30000) {
            item.status = "failed";
            item.error = "Download launch was interrupted. Retry to start again.";
        }
        return;
    }
    item.recordingId = job.recordingId;
    const info = await readDownloadJobInfo(job.recordingId).catch(() => null);
    if (info) { item.finalFileName = path.basename(info.job.finalOutputFile); item.status = "completed"; item.progressPercent = 100; return; }
    const raw = await fs.readFile(job.statusFile, "utf8").catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
        return "";
    });
    const status = parseLatestStatus(raw);
    if (status.STATUS === "done") {
        if (!await finalizeJobStart(item.cacheKey)) throw new Error("Download finalization failed");
        const finalized = await readDownloadJobInfo(job.recordingId);
        if (finalized) item.finalFileName = path.basename(finalized.job.finalOutputFile);
        item.status = "completed";
        item.progressPercent = 100;
        return;
    }
    if (["error", "stopped"].includes(status.STATUS)) {
        item.status = item.cancelRequested || status.STATUS === "stopped" ? "cancelled" : "failed";
        if (item.status === "failed") item.error = "Download failed. Retry to try again.";
        return;
    }
    // Validate ownership through Linux procfs before signalling; never trust a recycled PID.
    const pid = Number(status.PARENT_PID);
    const command = Number.isInteger(pid) && pid > 1 ? await fs.readFile(`/proc/${pid}/cmdline`, "utf8").catch(() => "") : "";
    const owned = command.split("\0").includes(job.outputFile) && command.includes("download.sh");
    if (owned && item.cancelRequested && status.PID) process.kill(pid, "SIGTERM");
    if (!owned && Date.now() - Date.parse(item.startedAt!) > 30000) {
        // Check curl too: do not start another item while an orphaned transfer is alive.
        const child = Number(status.PID);
        const childCommand = Number.isInteger(child) && child > 1 ? await fs.readFile(`/proc/${child}/cmdline`, "utf8").catch(() => "") : "";
        if (childCommand.split("\0").includes(`${job.outputFile}.part`)) return;
        item.status = "failed";
        item.error = "Download worker exited unexpectedly. Retry to start again.";
    }
    const logs = await fs.readFile(job.logFile, "utf8").catch(() => "");
    item.progressPercent = extractLatestDownloadProgressPercent([logs]) ?? undefined;
}

export async function tickDownloadQueue() {
    await withQueue(async (state, save) => {
        for (const item of state.items.filter((row) => row.status === "downloading")) {
            try { await reconcile(item); }
            catch { item.error = "Waiting to finalize download. Check server logs and storage."; }
        }
        await save();
        if (!state.running || state.items.some((item) => item.status === "downloading")) return;
        const item = state.items.find((row) => row.status === "queued");
        if (!item) return; // Keep running: later additions start automatically.
        const resolver = new StreamingServiceResolver();
        const service = resolver.findById(item.serviceId);
        if (!service) { item.status = "failed"; item.error = "Streaming service is no longer configured"; await save(); return; }
        const active = await getActiveLiveJobs(); // Includes tracked playback consumers once.
        const used = active.filter((job) => job.entry && resolver.findByViewingUrl(job.entry.url)?.id === service.id).length;
        if (used >= service.maxConcurrentViewers) { item.error = "Waiting for an available provider connection"; await save(); return; }
        delete item.error;
        item.status = "downloading";
        item.startedAt = new Date().toISOString();
        await save(); // Persist claim before spawning, for recovery after a server restart.
        const result = await DownloadResolver.startDownload({ entry: item.entry, user: item.user, cacheKey: item.cacheKey, managedQueue: true });
        if (!result.success) { item.status = "failed"; item.error = "Could not launch download. Check server logs."; }
        else item.recordingId = result.recordingId;
        await save();
    });
}

export async function getQueue() {
    return withQueue(async (state) => ({
        running: state.running,
        items: state.items.map(({ entry, ...item }) => ({ ...item, entry: { ...entry, url: "", tvgLogo: "" } })),
    }));
}

const workerGlobal = globalThis as typeof globalThis & { downloadQueueTimer?: ReturnType<typeof setInterval> };
export function startDownloadQueueWorker() {
    if (workerGlobal.downloadQueueTimer) return;
    let busy = false;
    const tick = async () => {
        if (busy) return;
        busy = true;
        try { await tickDownloadQueue(); } catch { console.error("Download queue worker failed; will retry."); }
        finally { busy = false; }
    };
    workerGlobal.downloadQueueTimer = setInterval(() => void tick(), 3000);
    workerGlobal.downloadQueueTimer.unref();
    void tick();
}
