import { NextRequest, NextResponse } from "next/server";
import { parseM3U } from "@/utils/parseM3U";
import { ensureCacheDir, getCacheFilePath, isFileFresh, readFile, writeFile } from "@/utils/fileHandler";
import { inferContentCategory, ContentCategoryFieldLabel } from "@/types/ContentCategoryFieldLabel";
import { M3UResponse } from "@/types/M3UResponse";
import { sanitizeM3UUrls } from "@/utils/urlSanitizer";
import { appConfig } from "@/config";
import { StreamingServiceResolver } from "@/utils/StreamingServiceResolver";
import { ApiResponse, makeErrorResponse, makeSuccessResponse } from "@/types/ApiResponse";

const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<M3UResponse>>> {

    {
        const { url, username, serviceName } = await req.json();

        try {
            await ensureCacheDir();
            const cacheFilePath = getCacheFilePath(username, serviceName);
            const rawM3U = await getCachedOrFreshM3U(url, cacheFilePath);

            // Infer server origin with fallback port
            const urlObj = new URL(url);
            let serverOrigin = urlObj.origin;
            if (!urlObj.port) {
                 serverOrigin += ":80";
            }

            const resolver = new StreamingServiceResolver();
            const service = resolver.findByServer(serverOrigin);
            if (!service) {
                return makeErrorResponse("Service not found", 404);
            }

            // Parse entries
            const entries = parseM3U(rawM3U);
            if (!entries || entries.length === 0) {
                return makeErrorResponse("No valid entries found", 400);
            }

            // Sanitize if needed
            const sanitized = appConfig.hideCredentialsInUrl ? sanitizeM3UUrls(entries, service.username, service.password) : entries;

            const response: M3UResponse = {
                entries: sanitized,
                formats: extractFormats(sanitized),
                categories: extractCategories(sanitized),
                servers: [service.server], // 👈 this is important
            };

            return makeSuccessResponse<M3UResponse>(response);

        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            console.error("[M3U FETCH ERROR]", msg);
            return makeErrorResponse(msg, 500);
        }
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

    function extractFormats(entries: { url: string }[]): string[] {
        return Array.from(
            new Set(
                entries.map((e) => {
                    try {
                        return new URL(e.url).pathname.split(".").pop()?.toLowerCase() || "unknown";
                    } catch {
                        return "unknown";
                    }
                })
            )
        );
    }

    function extractCategories(entries: { url: string }[]): ContentCategoryFieldLabel[] {
        return Array.from(new Set(entries.map((e) => inferContentCategory(e.url)))).filter(Boolean);
    }



    
}
