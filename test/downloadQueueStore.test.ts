import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const location = vi.hoisted(() => ({ dir: "" }));
vi.mock("@/utils/fileHandler", () => ({ getCacheDir: () => location.dir }));
import { withQueue } from "@/lib/downloads/queueStore";
beforeEach(async () => { location.dir = await fs.mkdtemp(path.join(os.tmpdir(), "queue-store-")); });
afterEach(async () => { await fs.rm(location.dir, { recursive: true, force: true }); });
it("serializes concurrent claims and persists state atomically", async () => {
    const claimed: boolean[] = [];
    await Promise.all(Array.from({ length: 8 }, () => withQueue(async (state, save) => {
        claimed.push(!state.running);
        state.running = true;
        await save();
    })));
    expect(claimed.filter(Boolean)).toHaveLength(1);
    await withQueue(async (state) => expect(state.running).toBe(true));
});
it("releases its lock after a failed mutation", async () => {
    await expect(withQueue(async () => { throw new Error("failure"); })).rejects.toThrow("failure");
    await withQueue(async (state, save) => { state.running = true; await save(); });
});
it("does not overwrite corrupt queue records", async () => {
    await withQueue(async (_state, save) => save());
    const file = path.join(location.dir, "download-queue", "queue.json");
    await fs.writeFile(file, "broken");
    await expect(withQueue(async (_state, save) => save())).rejects.toThrow();
    expect(await fs.readFile(file, "utf8")).toBe("broken");
});
