import { getStreamFormatByExt } from "@/types/StreamFormat";
import { describe, it, expect } from "vitest";

describe("getStreamFormat sould match known formats", () => {
    it("should return MP4 for mp4", () => {
        const url = "http://example.com/video.mp4";
        const result = getStreamFormatByExt(url);
        expect(result).toBe("mp4");
    });

    it("should return MKV for mkv", () => {
        const url = "http://example.com/movie/1254.mkv";
        const result = getStreamFormatByExt(url);
        expect(result).toBe("mkv");
    });

    it("should return TS for ts", () => {
        const url = "http://example.com/video.ts";
        const result = getStreamFormatByExt(url);
        expect(result).toBe("ts");
    });

    it("should return AVI for avi", () => {
        const url = "http://example.com/video.avi";
        const result = getStreamFormatByExt(url);
        expect(result).toBe("avi");
    });
});

describe("getStreamFormat should return UNKNOWN for unknown formats", () => {
    it("should return UNKNOWN for unsupported formats", () => {
        const url = "http://example.com/video.unknown";
        const result = getStreamFormatByExt(url);
        expect(result).toBe("unknown");
    });

    it("should return UNKNOWN for no extension", () => {
        const url = "http://example.com/video";
        const result = getStreamFormatByExt(url);
        expect(result).toBe("unknown");
    });

    it("should return UNKNOWN for empty string", () => {
        const url = "";
        const result = getStreamFormatByExt(url);
        expect(result).toBe("unknown");
    });

    it("should return UNKNOWN for null", () => {
        const url = null;
        const result = getStreamFormatByExt(url);
        expect(result).toBe("unknown");
    });

    it("should return UNKNOWN for undefined", () => {
        const url = undefined;
        const result = getStreamFormatByExt(url);
        expect(result).toBe("unknown");
    });

    it("should return UNKNOWN for url that ends with number", () => {
        const url = "http://example.com/4575";
        const result = getStreamFormatByExt(url);
        expect(result).toBe("unknown");
    });
});
