import { parseM3U } from "@/utils/parseM3U";
import { readFileAssetSync } from "test/helpers/fileHelper";
import { describe, it, test, expect } from "vitest";

describe("parseM3U", () => {

    const content = readFileAssetSync("test.m3u");
    const entries = parseM3U(content);
    
    it("parses test.m3u from disk correctly", async () => {

        expect(entries.length).toBeGreaterThan(0);
        expect(entries[0]).toHaveProperty("name");
        expect(entries[0]).toHaveProperty("url");
        expect(entries[0]).toHaveProperty("tvgId");
        expect(entries[0]).toHaveProperty("tvgName");
        expect(entries[0]).toHaveProperty("tvgLogo");
        expect(entries[0]).toHaveProperty("groupTitle");
    });

    test("handles lines that do not start with #EXTINF", () => {
        const input = `
#EXTM3U
# Just a comment
https://not-parsed.com
    `;
        const result = parseM3U(input);
        expect(result).toEqual([]);
    });

    test("parses entry with some missing metadata", () => {
        const input = `
#EXTINF:-1 tvg-name="Some Channel",Some Channel
http://stream.example.com/abc
    `;
        const result = parseM3U(input);
        expect(result[0].tvgId).toBe("");
        expect(result[0].groupTitle).toBe("");
        expect(result[0].url).toBe("http://stream.example.com/abc");
    });

    test("parses entry with missing URL line (line is empty)", () => {
        const input = `
#EXTINF:-1 tvg-name="No URL",No URL

    `;
        const result = parseM3U(input);
        expect(result).toHaveLength(1);
        expect(result[0].url).toBe("");
    });

    test("handles #EXTINF without a following URL line (undefined)", () => {
        const input = '#EXTINF:-1 tvg-name="No URL",No URL'; // No newline!
        const result = parseM3U(input);
        expect(result).toHaveLength(1);
        expect(result[0].url).toBe("");
    });

    test("handles EXTINF line without a name (missing comma)", () => {
        const input = `
#EXTINF:-1 tvg-id="test" tvg-name="No Comma"
http://stream.example.com/unknown
    `;
        const result = parseM3U(input);
        expect(result[0].name).toBe("");
    });
});
