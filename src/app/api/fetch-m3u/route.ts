// src/app/api/fetch-m3u/route.ts
import { NextRequest, NextResponse } from "next/server";
import { parseM3U } from "@/utils/parseM3U";
import { ensureCacheDir, getCacheFilePath, getMediaDir, isFileFresh, readFile, readJsonFile, writeFile, writeJsonFile } from "@/utils/fileHandler";
import { inferContentCategory, ContentCategoryFieldLabel } from "@/types/ContentCategoryFieldLabel";
import { M3UResponse } from "@/types/M3UResponse";
import { sanitizeM3UUrls } from "@/utils/urlSanitizer";
import { appConfig } from "@/config";
import { StreamingServiceResolver } from "@/resolvers/StreamingServiceResolver";
import { ApiResponse, makeErrorResponse, makeSuccessResponse } from "@/types/ApiResponse";
import { CashedEntries } from "@/types/CashedEntries";
import crypto from "crypto";
import { FetchM3URequest } from "@/types/FetchM3URequest";
import { StreamFormat, getStreamFormatByExt } from "@/types/StreamFormat";
import { filterEntries } from "@/utils/filterEntries";
import { extractYears } from "@/utils/ui/extractYears";
import { auth } from "@/auth";
import { hasAdminAccess } from "@/utils/auth/accessControl";
import { StreamingService } from "@/types/StreamingService";
import { M3UEntry } from "@/types/M3UEntry";
import fs from "fs";
import path from "path";
import { getBaseUrl } from "@/utils/resolverUtils";
import { RecordingJobInfo } from "@/types/RecordingJobInfo";
import { startMovieConsumerCleanup } from "@/utils/concurrency";

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<M3UResponse>>> {
    {
        const { url, snapshotId, pagination, filters }: FetchM3URequest = await req.json();
        const force = req.nextUrl.searchParams.get("force") === "true";

        startMovieConsumerCleanup(); // timer to guard movie consumer players

        if (force) {
            const session = await auth();
            const user = session?.user;
            if (!user || !hasAdminAccess(user)) {
                return makeErrorResponse("Unauthorized: Only admins can force refresh", 403);
            }
        }

        try {
            let resolvedUrl: URL;
            try {
                resolvedUrl = new URL(url, req.nextUrl.origin); // supports relative URLs
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Invalid URL";
                return makeErrorResponse(msg, 400);
            }

            const serverOrigin = resolvedUrl.origin;

            await ensureCacheDir();

            const resolver = new StreamingServiceResolver();
            const service = resolver.findByServer(serverOrigin);
            if (!service) {
                return makeErrorResponse("Service not found", 404);
            }

            const chasedData = await getCachedOrFreshData(service, url, force);

            if (pagination?.offset && snapshotId && snapshotId !== chasedData.snapshotId) {
                console.log("[CACHE] Snapshot ID mismatch. Fetching fresh data.");
                return makeErrorResponse(`Your list is outdated, it was updated on ${chasedData.timeStamp}, refresh it to get new data`, 400);
            }

            if (!chasedData || !chasedData.entries || chasedData.entries.length === 0) {
                return makeErrorResponse("No valid entries found", 400);
            }

            const filtered = hasValidFilters(filters) ? filterEntries(chasedData.entries, filters) : chasedData.entries;

            const start = pagination?.offset || 0;
            const end = pagination?.limit ? start + pagination.limit : filtered.length;
            const paginated = filtered.slice(start, end);

            console.log(
                `[Filtered = ${hasValidFilters(filters)}] Entries count: ${paginated.length}, of filtered ${filtered.length} and total ${
                    chasedData.entries.length
                }`
            );

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

            return makeSuccessResponse<M3UResponse>(response);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            console.error("[M3U FETCH ERROR]", msg);
            return makeErrorResponse(msg, 500);
        }
    }

    async function getCachedOrFreshData(service: StreamingService, url: string, force: boolean): Promise<CashedEntries> {
        const username = service.username;
        const serviceName = service.name;
        const filePathCashed = getCacheFilePath(username, serviceName, "cashedEntries");

        const usingCache = !force && (await isFileFresh(filePathCashed, appConfig.playlistCacheTTLInMs));

        if (usingCache && !service.hasFileAccess) {
            console.log("[CACHE] Using cached file:", filePathCashed);
            return await readJsonFile<CashedEntries>(filePathCashed);
        }

        // Need a fresh m3u file and parse it
        const cacheFilePathM3U = getCacheFilePath(username, serviceName, "m3u");

        const rawM3U = service.hasFileAccess ? await getCachedOrFreshM3UFromLocal(service) : await getCachedOrFreshM3U(url, cacheFilePathM3U, force);

        const entries = parseM3U(rawM3U);

        const snapshotId = crypto.createHash("sha1").update(JSON.stringify(entries)).digest("hex");
        const cashed: CashedEntries = {
            snapshotId,
            timeStamp: new Date().toISOString(),
            formats: extractFormats(entries),
            categories: extractCategories(entries),
            servers: [service.name],
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

    async function getCachedOrFreshM3UFromLocal(service: StreamingService): Promise<string> {
        const filePath = getCacheFilePath(service.username, service.name, "m3u");

        console.log("[FETCH] Creating fresh .m3u (local recordings)");
        const text = await makeM3UList(service);
        await writeFile(filePath, text);
        return text;
    }

    async function fetchM3UWithDebug(requestUrl: string): Promise<string> {
        console.log("[FETCH] Attempting download:", requestUrl);

        const controller = new AbortController();
        const timeoutMs = 15000;
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const res = await fetch(requestUrl, {
                method: "GET",
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    Accept: "*/*",
                    "Accept-Encoding": "identity", // avoid compression weirdness
                },
                redirect: "follow",
                cache: "no-store",
                next: { revalidate: 0 },
                signal: controller.signal,
            });

            const h = (k: string) => res.headers.get(k) || "-";

            console.log(`[FETCH] Status: ${res.status} ${res.statusText}`);
            console.log("[FETCH] Headers:", {
                "content-type": h("content-type"),
                "content-length": h("content-length"),
                "cache-control": h("cache-control"),
                "transfer-encoding": h("transfer-encoding"),
                server: h("server"),
            });

            const buf = new Uint8Array(await res.arrayBuffer());
            console.log("[FETCH] Body size:", buf.byteLength, "bytes");

            const sample = new TextDecoder().decode(buf.slice(0, 300));
            console.log("[FETCH] First 300 bytes:", JSON.stringify(sample));

            // Special messaging for common upstream failures you saw via curl
            if (res.status === 451) {
                throw new Error("Upstream blocked: 451 Unavailable For Legal Reasons (geo/IP or legal restriction).");
            }
            if (res.status === 403) {
                throw new Error("Upstream denied: 403 Forbidden (account/IP/user-agent blocked?).");
            }
            if (!res.ok) {
                throw new Error(`Remote server returned ${res.status} ${res.statusText}`);
            }
            if (buf.byteLength === 0) {
                throw new Error("Empty body from upstream");
            }

            const text = new TextDecoder().decode(buf);
            return text;
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : typeof err === "object" && err !== null && "toString" in err
                    ? String((err as { toString: () => string }).toString())
                    : "Unknown fetch error";
            console.error("[FETCH] Error:", message);
            throw new Error(message);
        } finally {
            clearTimeout(timeout);
        }
    }

    async function getCachedOrFreshM3U(url: string, filePath: string, force = false): Promise<string> {
        if (!force && (await isFileFresh(filePath, appConfig.playlistCacheTTLInMs))) {
            console.log("[CACHE] Using cached file:", filePath);
            return await readFile(filePath);
        }

        console.log("[FETCH] Downloading fresh .m3u");
        try {
            const text = await fetchM3UWithDebug(url);

            // Basic sanity checks to avoid caching garbage
            const looksLikeM3U = text.startsWith("#EXTM3U") || text.includes("#EXTINF");
            if (!looksLikeM3U) {
                console.warn("[FETCH] Response does not look like M3U; refusing to cache.");
                throw new Error("Response is not an M3U playlist");
            }

            await writeFile(filePath, text);
            return text;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Unknown fetch error";
            // If we have an older cache, fall back to it instead of hard failing
            const hasOld = await isFileFresh(filePath, Number.MAX_SAFE_INTEGER).catch(() => false);
            if (hasOld) {
                console.warn("[FETCH] Using stale cached M3U due to fetch error:", msg);
                return await readFile(filePath);
            }
            throw new Error(msg);
        }
    }

    function extractFormats(entries: { url: string }[]): StreamFormat[] {
        return Array.from(
            new Set(
                entries.map((e) => {
                    try {
                        return getStreamFormatByExt(e.url);
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
            if (typeof value === "string") return value.trim() !== "";
            if (Array.isArray(value)) return value.length > 0;
            if (typeof value === "object" && "value" in value) {
                const v = (value as { value: string }).value;
                return v.trim() !== "";
            }
            return true;
        });
    }
}

async function makeM3UList(service: StreamingService): Promise<string> {
    let listM3U = "#EXTM3U";
    const mediaDir = getMediaDir();
    const fileList = fs.readdirSync(mediaDir).filter((file) => !file.endsWith(".json"));

    for (const file of fileList) {
        const filePath = path.join(mediaDir, file);
        const fileStat = fs.statSync(filePath);
        if (fileStat.isFile()) {
            const jsonFilePath = path.join(mediaDir, file + ".json");
            const jsonData = fs.existsSync(jsonFilePath) ? await readJsonFile<RecordingJobInfo>(jsonFilePath) : null;
            let str: string;
            if (jsonData && jsonData?.job && jsonData?.job?.entry) {
                str = makeM3UListEntry(jsonData.job.entry, makeMediaUrl(service.id, filePath));
            } else {
                str = makeM3UListEntry(makeM3UEmptyEntry(service.id, filePath), makeMediaUrl(service.id, filePath));
            }

            listM3U += `\n${str}`;
        }
    }

    return listM3U;
}

// works  : http://localhost:3000/api/video/local-recordings/media/uk_bbc_1_hd.mp4
// broken : http://localhost:3000/api/stream-proxy/%2Fmedia%2Fuk_bbc_1_hd.mp4
function makeMediaUrl(serviceId: string, fullFilePath: string): string {
    const baseUrl = getBaseUrl();
    const strippedPath = fullFilePath.replace(/\\/g, "/").replace(/.*\/videos\//, "");
    const url = `${baseUrl}/api/video/${serviceId}/${strippedPath}`;
    return url;
}

function makeM3UListEntry(entry: M3UEntry, url: string): string {
    const { tvgId, tvgName, tvgLogo, groupTitle, name } = entry;
    const infoLine = `#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${tvgName}" tvg-logo="${tvgLogo}" group-title="${groupTitle}",${name}`;
    return `${infoLine}\n${url}`;
}

function makeM3UEmptyEntry(serviceId: string, filePath: string): M3UEntry {
    const url = makeMediaUrl(serviceId, filePath);
    const fileName = path.basename(filePath, path.extname(filePath));
    const ext = path.extname(filePath).substring(1);

    const entry: M3UEntry = {
        tvgId: fileName,
        tvgName: fileName,
        tvgLogo: "/fallback.png",
        groupTitle: `format:${getStreamFormatByExt(ext)}`,
        name: fileName,
        url,
    };

    return entry;
}
