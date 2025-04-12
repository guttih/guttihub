import { describe, it, expect } from "vitest";
import { readFileAssetSync } from "../helpers/fileHelper";
import { parseM3U } from "@/utils/parseM3U";
import { getCacheFilePath } from "@/utils/fileHandler";

function testPerformance(label: string, fn: () => unknown): number {
    const start = performance.now();
    fn();
    const end = performance.now();
    const duration = end - start;
    console.log(`[Performance] ${label} took ${duration.toFixed(2)}ms`);
    return duration;
}

function validateEntriesStructure(entries: unknown[]) {
    expect(entries.length).toBeGreaterThan(0);
    const entry = entries[0];
    expect(entry).toHaveProperty("name");
    expect(entry).toHaveProperty("url");
    expect(entry).toHaveProperty("tvgId");
    expect(entry).toHaveProperty("tvgName");
    expect(entry).toHaveProperty("tvgLogo");
    expect(entry).toHaveProperty("groupTitle");
}

describe("parseM3U comparison", () => {
    const content1 = readFileAssetSync(getCacheFilePath("k5W1gNfZWQ0C", "bigotvpro"));
    const content2 = readFileAssetSync(getCacheFilePath("7d483beb4604", "m3u.best-smarter.me"));

    it("Parse 1 - entries count and structure", () => {
        const fastEntries = parseM3U(content1);
        console.log("[Parser Test 1] Fast entries:", fastEntries.length);
        validateEntriesStructure(fastEntries);
        expect(fastEntries.length).toBeGreaterThanOrEqual(128782);
    });

    it("Parse 2 - entries count and structure", () => {
        const fastEntries = parseM3U(content2);
        console.log("[Parser Test 2] Fast entries:", fastEntries.length);
        validateEntriesStructure(fastEntries);
        expect(fastEntries.length).toBeGreaterThanOrEqual(277317);
    });

    it("Performance: fast should be faster than 0.5 seconds ", () => {
        const fastTime = testPerformance("Fast parser 1", () => parseM3U(content1));

        // one second
        expect(fastTime).toBeLessThan(500);
    });
});
