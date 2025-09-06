// src/app/api/fetch-m3u/route.ts
import { NextRequest, NextResponse } from "next/server";
import { parseM3U } from "@/utils/parseM3U";
import { ensureCacheDir, getCacheFilePath, getMediaDir, isFileFresh, readFile, readJsonFile, writeFile, writeJsonFile, fileExists, deleteFileAndForget } from "@/utils/fileHandler";
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
import { logger } from "@/utils/logger";

// Track background refresh tasks to avoid duplicate work per cache file
const activeRefreshes = new Set<string>();

// Minimal types for Xtream JSON API responses used below
interface XtreamLiveItem {
    stream_id?: number | string;
    name?: string;
    stream_icon?: string;
}

interface XtreamVodItem {
    stream_id?: number | string;
    name?: string;
    stream_icon?: string;
    cover?: string;
    container_extension?: string;
}

interface XtreamSeriesItem {
    series_id?: number | string;
    seriesId?: number | string; // some APIs use seriesId
    id?: number | string;       // fallback key
    name?: string;
    cover?: string;
}

interface XtreamEpisodeInfo {
    movie_image?: string;
}

interface XtreamEpisode {
    id?: number | string;
    title?: string;
    container_extension?: string;
    info?: XtreamEpisodeInfo;
}

interface XtreamSeriesInfo {
    info?: { name?: string; cover?: string };
    episodes?: Record<string, XtreamEpisode[] | XtreamEpisode>;
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<M3UResponse>>> {
    {
        const { url, snapshotId, pagination, filters }: FetchM3URequest = await req.json();
        const force = req.nextUrl.searchParams.get("force") === "true";
        const prime = req.nextUrl.searchParams.get("prime") === "true";
        const n = (k: string, d?: number) => {
            const v = req.nextUrl.searchParams.get(k);
            if (!v) return d;
            const i = parseInt(v, 10);
            return Number.isFinite(i) && i > 0 ? i : d;
        };
        const limits = {
            prime,
            maxLive: n("maxLive", prime ? 50 : undefined),
            maxVod: n("maxVod", prime ? 50 : undefined),
            maxSeries: n("maxSeries", prime ? 10 : undefined),
            maxEpisodesPerSeries: n("maxEpisodes", prime ? 20 : undefined),
        } as const;

        startMovieConsumerCleanup(); // timer to gard movie consumer players

        // High-level request context (helps devs trace behavior quickly)
        logger.info(`[FETCH] /api/fetch-m3u url=${url} force=${force} prime=${prime} limits=${JSON.stringify(limits)}`);

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

            logger.info(
                `[SERVICE] name=${service.name} id=${service.id} apiType=${service.apiType ?? "m3u"} hasFileAccess=${
                    service.hasFileAccess ? "true" : "false"
                }`
            );

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
            const chasedData = await getCachedOrFreshData(service, url, force, limits);
            // }

            if (pagination?.offset && snapshotId && snapshotId !== chasedData.snapshotId) {
                logger.info("[CACHE] Snapshot ID mismatch. Fetching fresh data.");
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

            logger.info(
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

            // logger.info("Response:", makePrintableM3UResponse(response));

            return makeSuccessResponse<M3UResponse>(response);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            logger.error("[M3U FETCH ERROR]", msg);
            return makeErrorResponse(msg, 500);
        }
    }

    type XtreamLimits = { prime?: boolean; maxLive?: number; maxVod?: number; maxSeries?: number; maxEpisodesPerSeries?: number };
    function normalizeXtreamLimits(limits: XtreamLimits | undefined, hasCache: boolean): XtreamLimits | undefined {
        if (hasCache) return limits; // no change if cache exists
        // First build: prefer conservative prime defaults to reduce upstream failures
        const primeDefaults: Required<Omit<XtreamLimits, "prime">> = {
            maxLive: 200,
            maxVod: 200,
            maxSeries: 100,
            maxEpisodesPerSeries: 20,
        };
        const l = limits ?? {};
        return {
            prime: true,
            maxLive: l.maxLive ?? primeDefaults.maxLive,
            maxVod: l.maxVod ?? primeDefaults.maxVod,
            maxSeries: l.maxSeries ?? primeDefaults.maxSeries,
            maxEpisodesPerSeries: l.maxEpisodesPerSeries ?? primeDefaults.maxEpisodesPerSeries,
        };
    }
    async function getCachedOrFreshData(service: StreamingService, url: string, force: boolean, limits?: XtreamLimits): Promise<CashedEntries> {
        const username = service.username;
        const serviceName = service.name;
        const filePathCashed = getCacheFilePath(username, serviceName, "cashedEntries");
        logger.info(`[CACHE] Cache file path: ${filePathCashed}`);

        const usingCache = !force && (await isFileFresh(filePathCashed, appConfig.playlistCacheTTLInMs));
        const cacheExists = await fileExists(filePathCashed).catch(() => false);

        if (usingCache && !service.hasFileAccess) {
            logger.info("[CACHE] Using cached file:", filePathCashed);
            return await readJsonFile<CashedEntries>(filePathCashed);
        }

        // If cache exists but is stale, return it immediately and refresh in background (remote only)
        if (!usingCache && cacheExists && !force && !service.hasFileAccess) {
            logger.info(`[CACHE] Using stale cache and refreshing in background: ${filePathCashed}`);
            const stale = await readJsonFile<CashedEntries>(filePathCashed);
            // fire and forget
            triggerBackgroundRefresh(service, url, filePathCashed, limits).catch((err) => {
                logger.warn(`[CACHE] Background refresh failed for ${service.name}`, err);
            });
            return stale;
        }

        // If the service uses Xtream JSON API (e.g., best-smarter), build entries from JSON
        if (isXtreamJsonApi(service)) {
            logger.info(`[FETCH] Strategy: Xtream JSON API`);
            const effLimits = normalizeXtreamLimits(limits, cacheExists);
            const cashed = await getFromXtreamJsonApi(service, filePathCashed, effLimits);
            return cashed;
        }

        // We need a fresh m3u file and parse it

        const cacheFilePathM3U = getCacheFilePath(username, serviceName, "m3u");
        logger.info(`[CACHE] M3U cache path: ${cacheFilePathM3U}`);

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

        logger.info(`[CACHE] Writing new file: ${filePathCashed} at ${cashed.timeStamp}`);
        logger.info("writing cashed entries:", {
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

    async function triggerBackgroundRefresh(service: StreamingService, url: string, filePathCashed: string, limits?: XtreamLimits): Promise<void> {
        if (activeRefreshes.has(filePathCashed)) {
            logger.info(`[CACHE] Background refresh already running for ${filePathCashed}`);
            return;
        }
        activeRefreshes.add(filePathCashed);
        logger.info(`[CACHE] Starting background refresh for ${service.name}`);
        const lockPath = `${filePathCashed}.lock`;
        try {
            // create lock marker so other endpoints can report status
            await writeFile(lockPath, new Date().toISOString());
            if (isXtreamJsonApi(service)) {
                await getFromXtreamJsonApi(service, filePathCashed, limits);
            } else {
                const cacheFilePathM3U = getCacheFilePath(service.username, service.name, "m3u");
                const rawM3U = service.hasFileAccess
                    ? await getCachedOrFreshM3UFromLocal(service)
                    : await getCachedOrFreshM3U(url, cacheFilePathM3U, true); // force download fresh m3u
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
                await writeJsonFile(filePathCashed, cashed);
                logger.info(`[CACHE] Background refresh wrote: ${filePathCashed}`);
            }
        } catch (err) {
            logger.warn(`[CACHE] Background refresh error for ${service.name}`, err);
        } finally {
            activeRefreshes.delete(filePathCashed);
            deleteFileAndForget(lockPath);
        }
    }

    function isXtreamJsonApi(service: StreamingService): boolean {
        // Prefer explicit config flag; keep hostname as safe fallback
        if (service.apiType === "xtream") return true;
        const host = service.server.toLowerCase();
        return host.includes("best-smarter.me");
    }

    async function getFromXtreamJsonApi(service: StreamingService, filePathCashed: string, limits?: XtreamLimits): Promise<CashedEntries> {
        const base = service.server.replace(/\/$/, "");
        const u = encodeURIComponent(service.username);
        const p = encodeURIComponent(service.password);

        logger.info(`[FETCH:XTREAM] Fetching JSON for ${service.name} ${limits?.prime ? "(prime)" : ""}`);

        // Fetch JSON lists (live, vod, series) with light retry and independent fallbacks
        let live: unknown = [];
        let vod: unknown = [];
        let slist: unknown = [];
        try {
            live = await fetchJsonRetry<unknown>(`${base}/player_api.php?username=${u}&password=${p}&action=get_live_streams`, 1);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.warn(`[FETCH:XTREAM] live list failed: ${msg}`);
        }
        try {
            vod = await fetchJsonRetry<unknown>(`${base}/player_api.php?username=${u}&password=${p}&action=get_vod_streams`, 1);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.warn(`[FETCH:XTREAM] vod list failed: ${msg}`);
        }
        try {
            slist = await fetchJsonRetry<unknown>(`${base}/player_api.php?username=${u}&password=${p}&action=get_series`, 1);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.warn(`[FETCH:XTREAM] series list failed: ${msg}`);
        }

        if (Array.isArray(live) && limits?.maxLive) live = live.slice(0, limits.maxLive);
        if (Array.isArray(vod) && limits?.maxVod) vod = vod.slice(0, limits.maxVod);
        if (Array.isArray(slist) && limits?.maxSeries) slist = slist.slice(0, limits.maxSeries);

        // Series episodes (optional but valuable). Fetch sequentially; log light progress.
        const seriesEntries: M3UEntry[] = [];
        const seriesList: XtreamSeriesItem[] = Array.isArray(slist) ? (slist as XtreamSeriesItem[]) : [];
        const totalSeries = seriesList.length;
        let processedSeries = 0;
        let failedSeriesInfo = 0;
        const seriesStart = Date.now();
        if (totalSeries > 0) {
            logger.info(`[FETCH:XTREAM] Series list size: ${totalSeries}`);
        }
        for (const s of seriesList) {
            const sid = s?.series_id ?? s?.seriesId ?? s?.id;
            if (!sid) continue;
            try {
                const info = await fetchJson<XtreamSeriesInfo>(`${base}/player_api.php?username=${u}&password=${p}&action=get_series_info&series_id=${sid}`);
                let eps: XtreamEpisode[] = [];
                if (info?.episodes && typeof info.episodes === "object") {
                    const episodesObj = info.episodes as Record<string, XtreamEpisode[] | XtreamEpisode>;
                    eps = Object.values(episodesObj).flatMap((v) => (Array.isArray(v) ? v : [v]));
                }
                if (limits?.maxEpisodesPerSeries && Array.isArray(eps)) eps = eps.slice(0, limits.maxEpisodesPerSeries);
                const titlePrefix = s?.name || info?.info?.name || "";
                for (const e of eps) {
                    const eid = e?.id;
                    if (!eid) continue;
                    const ext = (e?.container_extension || "m3u8").toString().replace(/^\./, "");
                    const url = `${base}/series/${service.username}/${service.password}/${eid}.${ext}`;
                    seriesEntries.push(toEntry({
                        id: String(eid),
                        name: e?.title ? `${titlePrefix ? titlePrefix + " - " : ""}${e.title}` : (titlePrefix || String(eid)),
                        logo: e?.info?.movie_image || s?.cover || info?.info?.cover || appConfig.fallbackImage,
                        url,
                    }));
                }
            } catch (err) {
                failedSeriesInfo++;
                const msg = err instanceof Error ? err.message : String(err);
                if (failedSeriesInfo <= 3) {
                    logger.warn(`[FETCH:XTREAM] series_info failed for series_id=${sid}: ${msg}`);
                } else if (failedSeriesInfo === 4) {
                    logger.warn(`[FETCH:XTREAM] many series_info failures; further details suppressed`);
                }
            }
            processedSeries++;
            if (processedSeries % 25 === 0) {
                const elapsedSec = (Date.now() - seriesStart) / 1000;
                const rate = processedSeries > 0 && elapsedSec > 0 ? processedSeries / elapsedSec : 0;
                const estTotalSec = rate > 0 ? totalSeries / rate : 0;
                const leftSec = Math.max(0, estTotalSec - elapsedSec);
                const fmt = (sec: number) => {
                    const s = Math.round(sec);
                    const h = Math.floor(s / 3600);
                    const m = Math.floor((s % 3600) / 60);
                    const ss = s % 60;
                    return h > 0 ? `${h}h ${m}m ${ss}s` : `${m}m ${ss}s`;
                };
                logger.info(
                    `[FETCH:XTREAM] progress series ${processedSeries}/${totalSeries} (fails=${failedSeriesInfo}, episodes=${seriesEntries.length}) ETA total=${fmt(estTotalSec)}, left=${fmt(leftSec)}`
                );
            }
        }
        if (totalSeries > 0) {
            const elapsedSec = (Date.now() - seriesStart) / 1000;
            const fmt = (sec: number) => {
                const s = Math.round(sec);
                const h = Math.floor(s / 3600);
                const m = Math.floor((s % 3600) / 60);
                const ss = s % 60;
                return h > 0 ? `${h}h ${m}m ${ss}s` : `${m}m ${ss}s`;
            };
            logger.info(
                `[FETCH:XTREAM] series phase done: ${processedSeries}/${totalSeries} (fails=${failedSeriesInfo}, episodes=${seriesEntries.length}) elapsed=${fmt(elapsedSec)}`
            );
        }

        // Live entries
        const liveEntries: M3UEntry[] = (Array.isArray(live) ? (live as XtreamLiveItem[]) : []).map((it) => {
            const sid = it?.stream_id;
            const url = `${base}/live/${service.username}/${service.password}/${sid}.m3u8`;
            return toEntry({
                id: String(sid ?? ""),
                name: it?.name || String(sid ?? ""),
                logo: it?.stream_icon || appConfig.fallbackImage,
                url,
            });
        });

        // VOD entries (movies)
        const vodEntries: M3UEntry[] = (Array.isArray(vod) ? (vod as XtreamVodItem[]) : []).map((it) => {
            const sid = it?.stream_id;
            const extRaw = (it?.container_extension || "m3u8").toString();
            const ext = extRaw.startsWith(".") ? extRaw.slice(1) : extRaw;
            const url = `${base}/movie/${service.username}/${service.password}/${sid}.${ext}`;
            return toEntry({
                id: String(sid ?? ""),
                name: it?.name || String(sid ?? ""),
                logo: it?.stream_icon || it?.cover || appConfig.fallbackImage,
                url,
            });
        });

        const entries = [...liveEntries, ...vodEntries, ...seriesEntries];
        const snapshotId = crypto.createHash("sha1").update(JSON.stringify(entries)).digest("hex");
        const cashed: CashedEntries = {
            snapshotId,
            timeStamp: new Date().toISOString(),
            formats: extractFormats(entries),
            categories: extractCategories(entries),
            servers: [service.name],
            entries,
        };

        await writeJsonFile(filePathCashed, cashed);
        logger.info(`[CACHE:XTREAM] Wrote ${entries.length} entries to ${filePathCashed}`);
        return cashed;
    }

    async function fetchJson<T>(url: string): Promise<T> {
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        const txt = await res.text();
        try {
            return JSON.parse(txt) as T;
        } catch (e) {
            logger.warn(`[FETCH:XTREAM] Non-JSON response for ${url.substring(0, 80)}...`);
            throw e;
        }
    }

    function sleep(ms: number): Promise<void> {
        return new Promise((r) => setTimeout(r, ms));
    }

    async function fetchJsonRetry<T>(url: string, retries = 1, baseDelayMs = 300): Promise<T> {
        let attempt = 0;
        for (;;) {
            try {
                return await fetchJson<T>(url);
            } catch (err) {
                attempt++;
                if (attempt > retries) throw err;
                const jitter = Math.floor(Math.random() * 200);
                await sleep(baseDelayMs * attempt + jitter);
            }
        }
    }

    async function getCachedOrFreshM3UFromLocal(service: StreamingService): Promise<string> {
        const filePath = getCacheFilePath(service.username, service.name, "m3u");

        // for now there is no need to cache this, let's always create a new one to be sure we have the actual disk content
        // if (await isFileFresh(filePath, appConfig.playlistCacheTTLInMs)) {
        //     console.log("[CACHE] Using cached file:", filePath);
        //     return await readFile(filePath);
        // }
        logger.info("[FETCH] Creating fresh .m3u");
        const text = await makeM3UList(service);
        await writeFile(filePath, text); //why await?  we have the text already
        return text;
    }

    async function getCachedOrFreshM3U(url: string, filePath: string, force: boolean = false): Promise<string> {
        if (!force && (await isFileFresh(filePath, appConfig.playlistCacheTTLInMs))) {
            logger.info("[CACHE] Using cached file:", filePath);
            return await readFile(filePath);
        }

        logger.info("[FETCH] Downloading fresh .m3u");
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

function toEntry(p: { id: string; name: string; logo: string | undefined; url: string }): M3UEntry {
    const { id, name, logo, url } = p;
    return {
        tvgId: id || "",
        tvgName: name || "",
        tvgLogo: logo || appConfig.fallbackImage,
        groupTitle: inferContentCategory(url),
        name: name || id || url,
        url,
    };
}
