// src/utils/JobctlMetaExpander.ts
import { JobctlParsedMeta, JobctlEnrichedScheduledJob } from "@/types/JobctlParsedMeta";
import { Job, JobctlListSuccess, JobctlResult } from "@/types/Jobctl";
import { jobctlParser } from "./jobctlParser";
import { readCashedEntryFile } from "@/utils/fileHandler";
import { M3UEntry } from "@/types/M3UEntry";
import { runJobctl } from "./jobctl";


export async function expandAllJobs(): Promise<JobctlEnrichedScheduledJob[]> {
    const result: JobctlResult = await runJobctl("list");
  
    if (!result.ok || !("jobs" in result)) {
      console.error("❌ Failed to load job list");
      return [];
    }
  
    // ✅ This cast here ensures TypeScript knows this is the shape we expect
    const listResult = result as JobctlListSuccess;
  
    const expanded = await Promise.all(
      listResult.jobs.map((job: Job) => expandSingleJob(job))
    );
  
    return expanded.filter((j): j is JobctlEnrichedScheduledJob => j !== null);
  }

export async function expandSingleJob(job: Job): Promise<JobctlEnrichedScheduledJob | null> {
  const parsed: JobctlParsedMeta = jobctlParser(job);

  let entry: M3UEntry | null = null;
  if (parsed.cacheKey) {
    try {
        entry = await readCashedEntryFile(parsed.cacheKey);
      } catch (err) {
        console.warn("⚠️ Failed to read M3UEntry for", parsed.cacheKey, err);
      }
    }
  

  return {
    ...parsed,
    systemJobId: job.id,
    datetime: job.datetime,
    description: job.description,
    command: job.command,
    entry: entry || undefined,
  };
}
