import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { DownloadQueueState } from "@/types/DownloadQueue";
const mocks = vi.hoisted(() => ({ dir: "", state: { running: false, items: [] } as DownloadQueueState, info: vi.fn() }));
vi.mock("@/lib/downloads/queueStore", () => ({ withQueue: (action: (state: DownloadQueueState) => unknown) => action(mocks.state) }));
vi.mock("@/utils/fileHandler", () => ({ getMediaDir: () => mocks.dir, readDownloadJobInfo: mocks.info }));
import { createQueuePlaylist } from "@/lib/downloads/playlist";
beforeEach(async () => {
    mocks.dir = await fs.mkdtemp(path.join(os.tmpdir(), "queue-playlist-"));
    mocks.state = { running: false, items: [] };
    mocks.info.mockReset();
});
afterEach(async () => { await fs.rm(mocks.dir, { recursive: true, force: true }); });
function add(name: string, filename: string, status: "completed" | "queued" = "completed") {
    mocks.state.items.push({ id: name, cacheKey: name, serviceId: "test", user: "test", createdAt: "", status, finalFileName: filename,
        entry: { name, url: "https://provider.invalid/SECRET/movie.mp4", tvgName: "", tvgId: "", tvgLogo: "", groupTitle: "" } });
}
it("writes completed downloads in queue order using relative final filenames", async () => {
    add("Second movie", "Renamed movie 2.mkv");
    add("Waiting", "missing.mp4", "queued");
    add("First\nmovie", "#Movie 1.mp4");
    await fs.writeFile(path.join(mocks.dir, "Renamed movie 2.mkv"), "media");
    await fs.writeFile(path.join(mocks.dir, "#Movie 1.mp4"), "media");
    const result = await createQueuePlaylist();
    expect(result.count).toBe(2);
    expect(await fs.readFile(path.join(mocks.dir, result.filename), "utf8")).toBe("#EXTM3U\n#EXTINF:-1,Second movie\n./Renamed movie 2.mkv\n#EXTINF:-1,First movie\n./#Movie 1.mp4\n");
    const again = await createQueuePlaylist();
    expect(again.filename).not.toBe(result.filename);
});
it("uses finalization metadata for downloads completed before filenames were stored", async () => {
    add("Movie", "unused");
    delete mocks.state.items[0].finalFileName;
    mocks.state.items[0].recordingId = "download-id";
    mocks.info.mockResolvedValue({ job: { finalOutputFile: path.join(mocks.dir, "renamed.mp4") } });
    await fs.writeFile(path.join(mocks.dir, "renamed.mp4"), "media");
    const result = await createQueuePlaylist();
    expect(await fs.readFile(path.join(mocks.dir, result.filename), "utf8")).toContain("./renamed.mp4");
});
it("does not write a playlist for an empty queue or missing media", async () => {
    await expect(createQueuePlaylist()).rejects.toThrow();
    add("Missing", "missing.mp4");
    await expect(createQueuePlaylist()).rejects.toThrow();
    expect(await fs.readdir(mocks.dir)).toEqual([]);
});
it("rejects filenames containing paths or playlist line injection", async () => {
    add("Movie", "../outside.mp4");
    await expect(createQueuePlaylist()).rejects.toThrow();
    mocks.state.items[0].finalFileName = "movie\nother.mp4";
    await expect(createQueuePlaylist()).rejects.toThrow();
    expect(await fs.readdir(mocks.dir)).toEqual([]);
});
