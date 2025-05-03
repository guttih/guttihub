// src/utils/concurrency.ts

import { getActiveLiveJobs, readCashedEntryFile } from "@/utils/record/recordingJobUtils";
import { StreamingServiceResolver } from "@/resolvers/StreamingServiceResolver";
import { getJobsDir, ensureDownloadJobsDir } from "@/utils/fileHandler";
import { DownloadStatus } from "@/types/DownloadStatus";
import fs from "fs/promises";
import path from "path";

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
  
    // 3) 🆕 Count active downloads for this service
    let downloadCount = 0;
    const downloadJobs = await getActiveDownloadJobs();
    for (const job of downloadJobs) {
      const svc = resolver.findByViewingUrl(job.URL);
      if (svc?.id === serviceId) {
        downloadCount++;
      }
    }
  
    return liveCount + movieCount + downloadCount;
  }
  


/** Reads all active downloading jobs */
export async function getActiveDownloadJobs(): Promise<DownloadStatus[]> {
    const DOWNLOAD_JOBS_DIR = getJobsDir();
  
    try {
      await ensureDownloadJobsDir(); 
      const files = await fs.readdir(DOWNLOAD_JOBS_DIR);
      const jobs: DownloadStatus[] = [];
  
      for (const file of files) {
        if (!file.endsWith(".status")) continue;
  
        const filePath = path.join(DOWNLOAD_JOBS_DIR, file);
        const content = await fs.readFile(filePath, "utf-8");
        const lines = content.split("\n").filter(Boolean);
  
        const raw = Object.fromEntries(
            lines.map((line) => {
              const [key, ...rest] = line.split("=");
              return [key, rest.join("=")];
            })
          ) as { [key: string]: string };
          
          const job: DownloadStatus = {
            STATUS: raw.STATUS,
            STARTED_AT: raw.STARTED_AT,
            URL: raw.URL,
            OUTPUT_FILE: raw.OUTPUT_FILE,
            USER: raw.USER,
            PID: raw.PID,
          };
          
  
        if (job.STATUS === "downloading") {
          jobs.push(job);
        }
      }
  
      return jobs;
    } catch (err) {
      console.error("❌ Error reading active downloads:", err);
      return [];
    }
  }
  