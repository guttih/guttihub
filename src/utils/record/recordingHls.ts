import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";

export function validRecordingId(id: string): boolean {
    return /^[A-Za-z0-9_-]+$/.test(id);
}

/** Build one event playlist across capture retries, with unique segment URLs. */
export function readRecordingPlaylist(workDir: string, recordingId: string): string | null {
    if (!validRecordingId(recordingId)) return null;
    const partsDir = path.join(workDir, `${recordingId}_parts`);
    const baseUrl = `/api/hls-stream/${recordingId}/segments/`;
    if (!existsSync(partsDir)) {
        const legacy = path.join(workDir, `${recordingId}.m3u8`);
        if (!existsSync(legacy)) return null;
        return readFileSync(legacy, "utf8").replace(/^(.*\/)?segment_(\d+)\.ts$/gm,
            (_, __, num) => `${baseUrl}segment_${num}.ts`);
    }
    const playlists = readdirSync(partsDir)
        .filter((name) => /^attempt_\d+\.m3u8$/.test(name))
        .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
    let targetDuration = 4;
    const media: string[] = [];
    for (const file of playlists) {
        const attempt = file.match(/\d+/)![0];
        const lines = readFileSync(path.join(partsDir, file), "utf8").split(/\r?\n/);
        const part: string[] = [];
        let pending: string[] = [];
        for (const line of lines) {
            if (line.startsWith("#EXT-X-TARGETDURATION:")) {
                targetDuration = Math.max(targetDuration, Number(line.split(":")[1]) || 4);
            } else if (/^#EXTINF:|^#EXT-X-(DISCONTINUITY|PROGRAM-DATE-TIME|BYTERANGE)/.test(line)) {
                pending.push(line);
            } else if (/^(?:attempt_\d+\/)?segment_\d+\.ts$/.test(line)) {
                part.push(...pending, `${baseUrl}${path.basename(line)}?attempt=${attempt}`);
                pending = [];
            }
        }
        if (part.length) {
            if (media.length) media.push("#EXT-X-DISCONTINUITY");
            media.push(...part);
        }
    }
    if (!media.length) return null;
    const statusPath = path.join(workDir, `${recordingId}.mp4.status`);
    const status = existsSync(statusPath)
        ? readFileSync(statusPath, "utf8").match(/^STATUS=(.*)$/gm)?.at(-1)?.slice(7)
        : undefined;
    return ["#EXTM3U", "#EXT-X-VERSION:3", `#EXT-X-TARGETDURATION:${targetDuration}`,
        "#EXT-X-MEDIA-SEQUENCE:0", "#EXT-X-PLAYLIST-TYPE:EVENT", ...media,
        ...(status && status !== "recording" ? ["#EXT-X-ENDLIST"] : []), ""].join("\n");
}
