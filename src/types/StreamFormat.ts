export enum StreamFormat {
    MP4 = "mp4",
    MKV = "mkv",
    TS = "ts",
    AVI = "avi",
    UNKNOWN = "unknown",
    M3U8 = "m3u8",
    // FLV = 'flv',
    // MOV = 'mov',
    // WEBM = 'webm',
}

// Supported directly by browser or hls.js:
export const supportedFormats: StreamFormat[] = [
    StreamFormat.MP4,
    StreamFormat.MKV,
    StreamFormat.M3U8, // No wideo with this format was found on servers, it's only for live streams I guess
    // StreamFormat.AVI,  // Ttried a few, but no playback
    // StreamFormat.TS,   // Ttried a few, but no playback
    // StreamFormat.WEBM, // No wideo with this format was found on servers
    //  StreamFormat.FLV, // No wideo with this format was found on servers
    // StreamFormat.MOV,  // No wideo with this format was found on servers
];

export const getStreamFormatByExt = (url: string | null | undefined): StreamFormat => {
    if (!url || typeof url !== "string" || url.indexOf(".") < 1) {
        return StreamFormat.UNKNOWN;
    }

    const ext = url.slice(url.lastIndexOf(".") + 1).toLowerCase();

    // Check if the ext is one of the enum values
    const formats = Object.values(StreamFormat);
    return formats.includes(ext as StreamFormat) ? (ext as StreamFormat) : StreamFormat.UNKNOWN;
};

/**
 * A unified detector that:
 *  • treats "/hls-stream/<id>/playlist" URLs as M3U8
 *  • otherwise falls back to extension look‑up
 */
export function detectStreamFormat(url: string): StreamFormat {
    try {
        const p = new URL(url, window.location.origin);
        if (p.pathname.includes("/hls-stream") && p.pathname.endsWith("/playlist")) {
            return StreamFormat.M3U8;
        }
    } catch {
        // non‑absolute or invalid URL, fall through to ext‑based detection
    }

    return getStreamFormatByExt(url);
}
