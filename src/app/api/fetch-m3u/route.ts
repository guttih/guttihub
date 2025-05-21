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
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/authOptions";
import { getUserRoleServerOnly } from "@/utils/serverOnly/hasUserAccessLevel";
import { isModerator } from "@/types/UserRole";
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

        startMovieConsumerCleanup(); // timer to gard movie consumer players

        if (force) {
            const session = await getServerSession({ req, ...authOptions });
            const role = getUserRoleServerOnly(session?.user?.email);
            if (isModerator(role)) {
                return makeErrorResponse("Unauthorized: Only admins can force refresh", 403);
            }
        }

        try {
            // Infer server origin with fallback port
            let resolvedUrl: URL;

            try {
                resolvedUrl = new URL(url, req.nextUrl.origin); // supports relative URLs
            } catch (err) {
                if (err instanceof TypeError) {
                    return makeErrorResponse(err.message, 400);
                }
                return makeErrorResponse(`"Invalid URL provided: ${url}"`, 400);
            }

            const serverOrigin = resolvedUrl.origin;

            await ensureCacheDir();

            const resolver = new StreamingServiceResolver();
            const service = resolver.findByServer(serverOrigin);
            if (!service) {
                return makeErrorResponse("Service not found", 404);
            }

            //We do not need the m3u file, but we want the json file with the entries so let's move next 3 lines to a function

            // if (service.hasFileAccess === true) {
            //     console.log("[VIRTUAL] Loading recordings from internal API service %s", service.name);
            //     // makeM3UList(service);
            //     // const res = await fetch(service.refreshUrl);
            //     // if (!res.ok) {
            //     //     return makeErrorResponse("Failed to load local recordings", 500);
            //     // }

            //     // const json = await res.json();

            //     chasedData = json.data as CashedEntries;
            // } else {
            const chasedData = await getCachedOrFreshData(service, url, force);
            // }

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

    async function getCachedOrFreshData(service: StreamingService, url: string, force: boolean): Promise<CashedEntries> {
        const username = service.username;
        const serviceName = service.name;
        const filePathCashed = getCacheFilePath(username, serviceName, "cashedEntries");

        const usingCache = !force && (await isFileFresh(filePathCashed, appConfig.playlistCacheTTLInMs));

        if (usingCache && !service.hasFileAccess) {
            console.log("[CACHE] Using cached file:", filePathCashed);
            return await readJsonFile<CashedEntries>(filePathCashed);
        }

        // We need to a fresh m3u file and parse it

        const cacheFilePathM3U = getCacheFilePath(username, serviceName, "m3u");

        const rawM3U = service.hasFileAccess ? await getCachedOrFreshM3UFromLocal(service) : await getCachedOrFreshM3U(url, cacheFilePathM3U, force);

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

    async function getCachedOrFreshM3UFromLocal(service: StreamingService): Promise<string> {
        const filePath = getCacheFilePath(service.username, service.name, "m3u");

        // for now there is no need to cache this, let's always create a new one to be sure we have the actual disk content
        // if (await isFileFresh(filePath, appConfig.playlistCacheTTLInMs)) {
        //     console.log("[CACHE] Using cached file:", filePath);
        //     return await readFile(filePath);
        // }
        console.log("[FETCH] Creating fresh .m3u");
        const text = await makeM3UList(service);
        await writeFile(filePath, text); //why await?  we have the text already
        return text;
    }

    async function getCachedOrFreshM3U(url: string, filePath: string, force: boolean = false): Promise<string> {
        if (!force && (await isFileFresh(filePath, appConfig.playlistCacheTTLInMs))) {
            console.log("[CACHE] Using cached file:", filePath);
            return await readFile(filePath);
        }

        console.log("[FETCH] Downloading fresh .m3u");
        const response = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" },
        });
        const text = await response.text();
        await writeFile(filePath, text); // why await?  we have the text already
        return text;
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
                // jsonData.entry.url = makeMediaUrl(service.id, filePath);
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

    // -1 for live/unknown length; then all the tvg-* attrs, comma, and the display name.
    const infoLine = `#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${tvgName}" tvg-logo="${tvgLogo}" group-title="${groupTitle}",${name}`;

    // URL on its own line
    return `${infoLine}\n${url}`;
}

function makeM3UEmptyEntry(serviceId: string, filePath: string): M3UEntry {
    const url = makeMediaUrl(serviceId, filePath);
    const fileName = path.basename(filePath, path.extname(filePath));
    const ext = path.extname(filePath).substring(1);

    // Create a new M3UEntry object with default values
    const entry: M3UEntry = {
        tvgId: fileName,
        tvgName: fileName,
        tvgLogo: "/fallback.png",
        groupTitle: `format:${getStreamFormatByExt(ext)}`,
        name: fileName,
        url: url,
    };

    return entry;
}
