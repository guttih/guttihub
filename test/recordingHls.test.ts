import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, expect, it } from "vitest";
import { readRecordingPlaylist } from "@/utils/record/recordingHls";
const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });
it("serves an uninterrupted event playlist with distinct segments across retries", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "record-hls-")); dirs.push(dir);
    const parts = path.join(dir, "record_parts"); await fs.mkdir(parts);
    for (const attempt of [1, 2]) {
        await fs.writeFile(path.join(parts, `attempt_${attempt}.m3u8`), `#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXTINF:4,\nattempt_${attempt}/segment_000000.ts\n#EXT-X-ENDLIST\n`);
    }
    await fs.writeFile(path.join(dir, "record.mp4.status"), "STATUS=recording\n");
    const playlist = readRecordingPlaylist(dir, "record")!;
    expect(playlist).toContain("segment_000000.ts?attempt=1");
    expect(playlist).toContain("segment_000000.ts?attempt=2");
    expect(playlist).toContain("#EXT-X-DISCONTINUITY");
    expect(playlist).not.toContain("#EXT-X-ENDLIST");
    await fs.appendFile(path.join(dir, "record.mp4.status"), "STATUS=packaging\n");
    expect(readRecordingPlaylist(dir, "record")).toContain("#EXT-X-ENDLIST");
});
it("preserves legacy recording playback and rejects path traversal", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "record-hls-")); dirs.push(dir);
    await fs.writeFile(path.join(dir, "record.m3u8"), "#EXTM3U\n#EXTINF:4,\nrecord_hls/segment_001.ts\n");
    expect(readRecordingPlaylist(dir, "record")).toContain("/api/hls-stream/record/segments/segment_001.ts");
    expect(readRecordingPlaylist(dir, "../record")).toBeNull();
});
