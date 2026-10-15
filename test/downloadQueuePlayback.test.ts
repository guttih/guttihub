import fs from "fs/promises";
import os from "os";
import path from "path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ dir: "", allowed: true, filename: "Movie #1.mp4", status: "completed" }));
vi.mock("@/auth", () => ({ auth: async () => mocks.allowed ? { user: { role: "moderator" } } : null }));
vi.mock("@/utils/auth/accessControl", () => ({ hasModeratorAccess: () => mocks.allowed }));
vi.mock("@/lib/downloads/queue", () => ({ getQueue: async () => ({ items: [{ id: "test", status: mocks.status, finalFileName: mocks.filename }] }) }));
vi.mock("@/utils/fileHandler", () => ({ getMediaDir: () => mocks.dir, readDownloadJobInfo: vi.fn() }));
import { GET } from "@/app/api/download/queue/[id]/play/route";

beforeEach(async () => {
    mocks.dir = await fs.mkdtemp(path.join(os.tmpdir(), "queue-playback-"));
    mocks.allowed = true;
    mocks.filename = "Movie #1.mp4";
    mocks.status = "completed";
    await fs.writeFile(path.join(mocks.dir, mocks.filename), "0123456789");
});
afterEach(async () => { await fs.rm(mocks.dir, { recursive: true, force: true }); });
function play(range?: string) {
    return GET(new NextRequest("http://localhost/api/download/queue/test/play", { headers: range ? { range } : {} }), { params: Promise.resolve({ id: "test" }) });
}
it("serves the downloaded file and byte ranges for seeking", async () => {
    const full = await play();
    expect(full.status).toBe(200);
    expect(full.headers.get("Content-Type")).toBe("video/mp4");
    expect(await full.text()).toBe("0123456789");
    const partial = await play("bytes=2-5");
    expect(partial.status).toBe(206);
    expect(partial.headers.get("Content-Range")).toBe("bytes 2-5/10");
    expect(await partial.text()).toBe("2345");
    expect(await (await play("bytes=-3")).text()).toBe("789");
    expect((await play("bytes=20-")).status).toBe(416);
});
it("requires moderator access and a completed queue item", async () => {
    mocks.allowed = false;
    expect((await play()).status).toBe(403);
    mocks.allowed = true;
    mocks.status = "downloading";
    expect((await play()).status).toBe(404);
});
it("rejects traversal, missing files, and symlinks outside media storage", async () => {
    mocks.filename = "../outside.mp4";
    expect((await play()).status).toBe(404);
    mocks.filename = "missing.mp4";
    expect((await play()).status).toBe(404);
    mocks.filename = "outside.mp4";
    await fs.symlink(path.join(mocks.dir, ".."), path.join(mocks.dir, mocks.filename));
    expect((await play()).status).toBe(404);
});
