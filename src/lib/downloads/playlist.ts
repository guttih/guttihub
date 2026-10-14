import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { withQueue } from "./queueStore";
import { getMediaDir, readDownloadJobInfo } from "@/utils/fileHandler";

export async function createQueuePlaylist() {
    const completed = await withQueue(async (state) => state.items
        .filter((item) => item.status === "completed")
        .map((item) => ({ ...item, entry: { ...item.entry } })));
    if (!completed.length) throw new Error("No completed downloads to include");
    const directory = path.resolve(getMediaDir());
    const lines = ["#EXTM3U"];
    for (const item of completed) {
        let filename = item.finalFileName;
        if (!filename) {
            if (!item.recordingId) throw new Error("Completed download metadata is unavailable");
            const info = await readDownloadJobInfo(item.recordingId);
            const output = path.resolve(info.job.finalOutputFile);
            if (path.dirname(output) !== directory) throw new Error("Downloaded file is outside the media directory");
            filename = path.basename(output);
        }
        if (path.basename(filename) !== filename || /[\r\n\0\\]/.test(filename)) {
            throw new Error("Downloaded filename cannot be represented in a playlist");
        }
        const media = await fs.stat(path.join(directory, filename));
        if (!media.isFile()) throw new Error("A completed media file is unavailable");
        const title = item.entry.name.replace(/[\r\n\0]/g, " ");
        // ./ also makes filenames beginning with # unambiguous to M3U readers.
        lines.push(`#EXTINF:-1,${title}`, `./${filename}`);
    }
    const filename = `download-queue-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}.m3u`;
    await fs.writeFile(path.join(directory, filename), `${lines.join("\n")}\n`, { encoding: "utf8", flag: "wx" });
    return { filename, count: completed.length };
}
