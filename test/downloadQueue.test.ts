import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DownloadQueueState } from "@/types/DownloadQueue";

const mocks = vi.hoisted(() => ({
    state: { running: false, items: [] } as DownloadQueueState,
    save: vi.fn(), launch: vi.fn(), active: vi.fn(), job: vi.fn(), info: vi.fn(), read: vi.fn(), finalize: vi.fn(),
}));
vi.mock("@/lib/downloads/queueStore", () => ({ withQueue: (action: (state: DownloadQueueState, save: () => Promise<void>) => unknown) => action(mocks.state, mocks.save) }));
vi.mock("@/resolvers/DownloadResolver", () => ({ DownloadResolver: { startDownload: mocks.launch } }));
vi.mock("@/resolvers/StreamingServiceResolver", () => ({ StreamingServiceResolver: class {
    findById() { return { id: "test", maxConcurrentViewers: 1 }; }
    findByViewingUrl() { return { id: "test" }; }
} }));
vi.mock("@/utils/record/recordingJobUtils", () => ({ getActiveLiveJobs: mocks.active }));
vi.mock("@/utils/fileHandler", () => ({ readDownloadJobFile: mocks.job, readDownloadJobInfo: mocks.info }));
vi.mock("fs/promises", () => ({ default: { readFile: mocks.read } }));
vi.mock("@/utils/resolverUtils", () => ({ finalizeJobStart: mocks.finalize, parseLatestStatus: (raw: string) => Object.fromEntries(raw.split("\n").map((line) => { const i = line.indexOf("="); return [line.slice(0, i), line.slice(i + 1)]; })) }));
import { addToQueue, changeQueue, getQueue, tickDownloadQueue } from "@/lib/downloads/queue";
const entry = { name: "Movie", url: "https://provider.test/user/password/movie.mp4", tvgId: "", tvgName: "", tvgLogo: "", groupTitle: "Movies" };

beforeEach(() => {
    vi.clearAllMocks();
    mocks.state = { running: false, items: [] };
    mocks.active.mockResolvedValue([]);
    mocks.launch.mockResolvedValue({ success: true, recordingId: "download-id" });
    mocks.job.mockResolvedValue({ recordingId: "download-id", outputFile: "/tmp/movie", statusFile: "/tmp/movie.status", logFile: "/tmp/movie.log" });
    mocks.info.mockResolvedValue(null);
    mocks.finalize.mockResolvedValue(true);
});
describe("download queue", () => {
    it("deduplicates media and keeps additions while running", async () => {
        await addToQueue(entry, "test", "alice");
        await addToQueue(entry, "test", "alice");
        expect(mocks.state.items).toHaveLength(1);
        await changeQueue("start");
        await tickDownloadQueue();
        await addToQueue({ ...entry, url: entry.url.replace("movie.mp4", "next.mp4") }, "test", "alice");
        expect(mocks.state.items.map((row) => row.status)).toEqual(["downloading", "queued"]);
        expect(mocks.launch).toHaveBeenCalledTimes(1);
    });
    it("pauses without cancelling the current transfer", async () => {
        await addToQueue(entry, "test", "alice");
        await changeQueue("start");
        await tickDownloadQueue();
        await changeQueue("pause");
        expect(mocks.state.items[0].status).toBe("downloading");
        expect(mocks.state.running).toBe(false);
    });
    it("waits when playback uses the provider connection", async () => {
        await addToQueue(entry, "test", "alice");
        await changeQueue("start");
        mocks.active.mockResolvedValue([{ entry }]);
        await tickDownloadQueue();
        expect(mocks.launch).not.toHaveBeenCalled();
        expect(mocks.state.items[0].status).toBe("queued");
    });
    it("advances after failure and gives retries a fresh job identity", async () => {
        const id = await addToQueue(entry, "test", "alice");
        await addToQueue({ ...entry, url: entry.url.replace("movie.mp4", "next.mp4") }, "test", "alice");
        await changeQueue("start");
        await tickDownloadQueue();
        mocks.read.mockResolvedValue("STATUS=downloading\nSTATUS=error");
        await tickDownloadQueue();
        expect(mocks.state.items.map((row) => row.status)).toEqual(["failed", "downloading"]);
        const key = mocks.state.items[0].cacheKey;
        await changeQueue("retry", id);
        expect(mocks.state.items[0].cacheKey).not.toBe(key);
        expect(mocks.state.items[0].status).toBe("queued");
    });
    it("finalizes success before advancing and prevents removing active jobs", async () => {
        const id = await addToQueue(entry, "test", "alice");
        await changeQueue("start");
        await tickDownloadQueue();
        await expect(changeQueue("remove", id)).rejects.toThrow();
        mocks.read.mockResolvedValue("STATUS=done");
        await tickDownloadQueue();
        expect(mocks.finalize).toHaveBeenCalled();
        expect(mocks.state.items[0].status).toBe("completed");
    });
    it("recovers an interrupted launch without starting it twice", async () => {
        await addToQueue(entry, "test", "alice");
        await changeQueue("start");
        await tickDownloadQueue();
        mocks.state.items[0].startedAt = new Date(Date.now() - 60000).toISOString();
        mocks.job.mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }));
        await tickDownloadQueue();
        expect(mocks.state.items[0].status).toBe("failed");
        expect(mocks.launch).toHaveBeenCalledTimes(1);
    });
    it("holds the queue when finalization fails", async () => {
        await addToQueue(entry, "test", "alice");
        await changeQueue("start");
        await tickDownloadQueue();
        mocks.read.mockResolvedValue("STATUS=done");
        mocks.finalize.mockResolvedValue(false);
        await tickDownloadQueue();
        expect(mocks.state.items[0].status).toBe("downloading");
        expect(mocks.launch).toHaveBeenCalledTimes(1);
    });
    it("requests cancellation without freeing a slot before the worker stops", async () => {
        const id = await addToQueue(entry, "test", "alice");
        await changeQueue("start");
        await tickDownloadQueue();
        await changeQueue("cancel", id);
        expect(mocks.state.items[0].status).toBe("downloading");
        expect(mocks.state.items[0].cancelRequested).toBe(true);
        mocks.read.mockResolvedValue("STATUS=stopped");
        await tickDownloadQueue();
        expect(mocks.state.items[0].status).toBe("cancelled");
    });
    it("reorders waiting items around other statuses and launches the new first item", async () => {
        const first = await addToQueue(entry, "test", "alice");
        const second = await addToQueue({ ...entry, name: "Second", url: entry.url.replace("movie.mp4", "second.mp4") }, "test", "alice");
        const third = await addToQueue({ ...entry, name: "Third", url: entry.url.replace("movie.mp4", "third.mp4") }, "test", "alice");
        mocks.state.items[1].status = "completed";
        await changeQueue("moveUp", third);
        expect(mocks.state.items.map((row) => row.id)).toEqual([third, second, first]);
        await changeQueue("moveDown", third);
        expect(mocks.state.items.map((row) => row.id)).toEqual([first, second, third]);
        await changeQueue("moveDown", third); // Last waiting item stays in place.
        await changeQueue("moveUp", first); // First waiting item stays in place.
        expect(mocks.state.items.map((row) => row.id)).toEqual([first, second, third]);
        await expect(changeQueue("moveUp", second)).rejects.toThrow();
        await changeQueue("moveUp", third);
        await changeQueue("start");
        await tickDownloadQueue();
        expect(mocks.launch).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: mocks.state.items[0].cacheKey }));
        await expect(changeQueue("moveDown", third)).rejects.toThrow();
    });
    it("keeps credentials out of queue responses", async () => {
        await addToQueue(entry, "test", "alice");
        expect(JSON.stringify(await getQueue())).not.toContain("password");
    });
});
