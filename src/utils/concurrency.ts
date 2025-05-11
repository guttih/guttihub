// src/utils/concurrency.ts

import { getActiveLiveJobs } from "@/utils/record/recordingJobUtils";
import { StreamingServiceResolver } from "@/resolvers/StreamingServiceResolver";
import { MovieConsumerMeta } from "@/types/MovieConsumerMeta";
import { M3UEntry } from "@/types/M3UEntry";
import { readConsumers, writeConsumers } from "./fileMovieConsumerStore";
/**
 * Map of movie‐player consumerId → serviceId
 */
// const movieConsumers = new Map<string, MovieConsumerMeta>();

// export function getMovieConsumers(): Map<string, MovieConsumerMeta> {
//     return movieConsumers;
// }

export async function getMovieConsumers(): Promise<Map<string, MovieConsumerMeta>> {
    const raw = await readConsumers(); // raw is Record<string, MovieConsumerMeta>
    return new Map(Object.entries(raw)); // ✅ this returns Map<string, MovieConsumerMeta>
}

/** Call when an InlinePlayer mounts. */
export async function addMovieConsumer(consumerId: string, serviceId: string, entry: M3UEntry): Promise<void> {
    const resolver = new StreamingServiceResolver();
    const service = entry ? StreamingServiceResolver.extractServerFromUrl(entry.url) : null;
    const serviceIdFromUrl = service ? resolver.findByServer(service)?.id : null;
    const sId = serviceIdFromUrl ? serviceIdFromUrl : serviceId;
    // movieConsumers.set(consumerId, { serviceId: sid , serviceId, entry });
    await persistMovieConsumer(consumerId, sId, entry);
}

async function persistMovieConsumer(consumerId: string, serviceId: string, entry: M3UEntry): Promise<void> {
    const consumers = await readConsumers();
    consumers[consumerId] = { serviceId, entry };
    await writeConsumers(consumers);
}

/** Call when an InlinePlayer unmounts. */
// export function removeMovieConsumer(consumerId: string): void {
//     movieConsumers.delete(consumerId);
// }

export async function removeMovieConsumer(consumerId: string): Promise<void> {
    const consumers = await readConsumers();
    delete consumers[consumerId];
    await writeConsumers(consumers);
}

/**
 * Count how many “slots” are in use _for this service_:
 *   • active live/recording jobs  +
 *   • active movie players
 */
export async function getCombinedActiveCount(serviceId: string): Promise<number> {
    const resolver = new StreamingServiceResolver();

    // 1) Count active live/record jobs for this service
    const jobs = await getActiveLiveJobs();
    let liveCount = 0;
    for (const job of jobs) {
        // const entry = await readCashedEntryFile(job.cacheKey);
        if (!job.entry) continue;
        const svc = resolver.findByViewingUrl(job.entry.url);
        if (svc?.id === serviceId) {
            liveCount++;
        }
    }

    // 2) Count active movie players for this service
    const consumers = await getMovieConsumers(); // ✅ proper await
    let movieCount = 0;
    for (const [, meta] of consumers.entries()) {
        if (meta.serviceId === serviceId) {
            movieCount++;
        }
    }

    return liveCount + movieCount;
}
