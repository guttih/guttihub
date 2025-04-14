import { NextRequest, NextResponse } from "next/server";
import { parseM3U } from "@/utils/parseM3U";
import { ensureCacheDir, getCacheFilePath, isFileFresh, readFile, readJsonFile, writeFile, writeJsonFile } from "@/utils/fileHandler";
import { inferContentCategory, ContentCategoryFieldLabel } from "@/types/ContentCategoryFieldLabel";
import { M3UResponse } from "@/types/M3UResponse";
import { sanitizeM3UUrls } from "@/utils/urlSanitizer";
import { appConfig } from "@/config";
import { StreamingServiceResolver } from "@/utils/StreamingServiceResolver";
import { ApiResponse, makeErrorResponse, makeSuccessResponse } from "@/types/ApiResponse";
import { CashedEntries } from "@/types/CashedEntries";
import crypto from "crypto";
import { FetchM3URequest } from "@/types/FetchM3URequest";
import { StreamFormat, getStreamFormat } from "@/types/StreamFormat";
import { filterEntries } from "@/utils/filterEntries";
import { extractYears } from "@/utils/ui/extractYears";

const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<M3UResponse>>> {
    {
        const { url, snapshotId, pagination, filters }: FetchM3URequest = await req.json();

        try {
            // Infer server origin with fallback port
            const urlObj = new URL(url);
            let serverOrigin = urlObj.origin;
            if (!urlObj.port) {
                serverOrigin += ":80";
            }

            await ensureCacheDir();

            const resolver = new StreamingServiceResolver();
            const service = resolver.findByServer(serverOrigin);
            if (!service) {
                return makeErrorResponse("Service not found", 404);
            }

            await ensureCacheDir();

            //We do not need the m3u file, but we want the json file with the entries so let's move next 3 lines to a function
            const chasedData = await getCachedOrFreshData(url, service.username, service.name);

            if (pagination?.offset && snapshotId && snapshotId !== chasedData.snapshotId) {
                console.log("[CACHE] Snapshot ID mismatch. Fetching fresh data.");
                return makeErrorResponse(`Your list is outdated, it was updated on ${chasedData.timeStamp}, refresh it to get new data`, 400);
            }

            if (!chasedData || !chasedData.entries || chasedData.entries.length === 0) {
                return makeErrorResponse("No valid entries found", 400);
            }

            const filtered = hasValidFilters(filters) ? filterEntries(chasedData.entries, filters) : chasedData.entries;

            // ok now we need to select offset and limit

            const start = pagination?.offset || 0;
            const end = pagination?.limit ? start + pagination.limit : filtered.length;
            const paginated = filtered.slice(start, end);
            // does offset not need to be sent back to the client?
            // const paginated = filtered.slice(offset || 0, limit ? (offset || 0) + limit : filtered.length);

            console.log(
                `[Filtered = ${hasValidFilters(filters)}] Entries count: ${paginated.length}, of filtered ${filtered.length} and total ${
                    chasedData.entries.length
                }`
            );

            // Sanitize if needed
            const pageItems = appConfig.hideCredentialsInUrl ? sanitizeM3UUrls(paginated, service.username, service.password) : paginated;

            const response: M3UResponse = {
                snapshotId: chasedData.snapshotId,
                timeStamp: chasedData.timeStamp,
                entries: pageItems,
                servers: [chasedData.servers[0]],
                pagination: {
                    offset: start,
                    limit: end - start,
                },
                totalItems: filtered.length,
                totalPages: Math.ceil(filtered.length / (end - start)),
                formats: extractFormats(filtered),
                categories: extractCategories(filtered),
                years: extractYears(filtered),
            };

            // console.log("Response:", makePrintableM3UResponse(response));

            return makeSuccessResponse<M3UResponse>(response);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            console.error("[M3U FETCH ERROR]", msg);
            return makeErrorResponse(msg, 500);
        }
    }

    async function getCachedOrFreshData(url: string, username: string, serviceName: string): Promise<CashedEntries> {
        const filePathCashed = getCacheFilePath(username, serviceName, "cashedEntries");

        if (await isFileFresh(filePathCashed, CACHE_DURATION_MS)) {
            console.log("[CACHE] Using cached file:", filePathCashed);
            return await readJsonFile<CashedEntries>(filePathCashed);
        }

        // Fetch fresh .m3u, parse it, and write cashed entries to disk

        const cacheFilePathM3U = getCacheFilePath(username, serviceName, "m3u");
        const rawM3U = await getCachedOrFreshM3U(url, cacheFilePathM3U);

        const entries = parseM3U(rawM3U);

        const snapshotId = crypto.createHash("sha1").update(JSON.stringify(entries)).digest("hex");
        const cashed: CashedEntries = {
            snapshotId,
            timeStamp: new Date().toISOString(),
            formats: extractFormats(entries),
            categories: extractCategories(entries),
            servers: [serviceName],
            entries,
        };

        console.log(`[CACHE] Writing new file:", ${filePathCashed} at ${cashed.timeStamp}`);
        console.log("writing cashed entries:", {
            snapshotId: cashed.snapshotId,
            timeStamp: cashed.timeStamp,
            entriesCount: cashed.entries.length,
            formats: cashed.formats,
            categories: cashed.categories,
            servers: cashed.servers,
            firstEntry: cashed.entries[0],
            lastEntry: cashed.entries[cashed.entries.length - 1],
        });
        await writeJsonFile(filePathCashed, cashed);

        return cashed;
    }

    async function getCachedOrFreshM3U(url: string, filePath: string): Promise<string> {
        if (await isFileFresh(filePath, CACHE_DURATION_MS)) {
            console.log("[CACHE] Using cached file:", filePath);
            return await readFile(filePath);
        }

        console.log("[FETCH] Downloading fresh .m3u");
        const response = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" },
        });
        const text = await response.text();
        await writeFile(filePath, text);
        return text;
    }

    function extractFormats(entries: { url: string }[]): StreamFormat[] {
        return Array.from(
            new Set(
                entries.map((e) => {
                    try {
                        return getStreamFormat(e.url);
                    } catch {
                        return StreamFormat.UNKNOWN;
                    }
                })
            )
        );
    }

    function extractCategories(entries: { url: string }[]): ContentCategoryFieldLabel[] {
        return Array.from(new Set(entries.map((e) => inferContentCategory(e.url)))).filter(Boolean);
    }

    function hasValidFilters(filters: FetchM3URequest["filters"] = {}): boolean {
        return Object.entries(filters).some(([, value]) => {
            if (value === undefined || value === null) return false;
          
            if (typeof value === "string") {
              return value.trim() !== "";
            }
          
            if (Array.isArray(value)) {
              return value.length > 0;
            }
          
            if (typeof value === "object" && "value" in value) {
              return value.value.trim() !== "";
            }
          
            return true;
          });
          
    }
}
