import { parseM3U } from "@/utils/parseM3U";
import { readFileAssetSync } from "../helpers/fileHelper";
import { describe, it, expect } from "vitest";

describe("parseM3U", () => {
    const content = readFileAssetSync("test.m3u");
    const entries = parseM3U(content);

    it("should return 3 entries", () => {
        expect(entries.length).toBe(4);

    });
    it("parses test.m3u correctly", async () => {

        expect(entries[0]).toHaveProperty("name");
        expect(entries[0]).toHaveProperty("url");
        expect(entries[0]).toHaveProperty("tvgId");
        expect(entries[0]).toHaveProperty("tvgName");
        expect(entries[0]).toHaveProperty("tvgLogo");
        expect(entries[0]).toHaveProperty("groupTitle");
    });
});
