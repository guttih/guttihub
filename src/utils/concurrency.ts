// src/utils/concurrency.ts

import { getActiveLiveJobs, readCashedEntryFile } from "@/utils/record/recordingJobUtils";
import { StreamingServiceResolver } from "@/resolvers/StreamingServiceResolver";

/**
 * Map of movie‐player consumerId → serviceId
 */
const movieConsumers = new Map<string, string>();

/** Call when an InlinePlayer mounts. */
export function addMovieConsumer(consumerId: string, serviceId: string): void {
  movieConsumers.set(consumerId, serviceId);
}

/** Call when an InlinePlayer unmounts. */
export function removeMovieConsumer(consumerId: string): void {
  movieConsumers.delete(consumerId);
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
    const entry = await readCashedEntryFile(job.cacheKey);
    if (!entry) continue;

    // figure out which service this entry belongs to
    const svc = resolver.findByViewingUrl(entry.url);
    if (svc?.id === serviceId) {
      liveCount++;
    }
  }

  // 2) Count active movie players for this service
  let movieCount = 0;
  for (const sid of movieConsumers.values()) {
    if (sid === serviceId) {
      movieCount++;
    }
  }

  return liveCount + movieCount;
}
