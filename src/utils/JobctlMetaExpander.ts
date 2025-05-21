// src/utils/JobctlMetaExpander.ts
import { JobctlParsedMeta, JobctlEnrichedScheduledJob } from "@/types/JobctlParsedMeta";
import { Job, JobctlListSuccess, JobctlResult } from "@/types/Jobctl";
import { jobctlParser } from "./jobctlParser";
import { readRecordingJobFile } from "@/utils/fileHandler";
import { runJobctl } from "./jobctl";
import { RecordingJob } from "@/types/RecordingJob";


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

// export async function getExpandedJobById(id: string): Promise<JobctlEnrichedScheduledJob | null> {
//     const result: JobctlResult = await runJobctl("list");
//     if (!result.ok || !("jobs" in result)) {
//         console.error("❌ Failed to load job list");
//         return null;
//     }

//     const singleJob = (result as JobctlListSuccess).jobs.find((job) => job.id === id);

//     if (!singleJob) {
//         console.error("❌ Job not found");
//         return null;
//     }
    
//     return expandSingleJob(singleJob);
// }
    

export async function expandSingleJob(job: Job): Promise<JobctlEnrichedScheduledJob> {
  const parsed: JobctlParsedMeta = jobctlParser(job);

  let jobOnDisk: RecordingJob | null = null;
  if (parsed.cacheKey) {
    try {
        jobOnDisk = await readRecordingJobFile(parsed.cacheKey);
      } catch (err) {
        console.warn("⚠️ Failed to read RecordingJob for", parsed.cacheKey, err);
      }
    }
  

  return {
    ...parsed,
    systemJobId: job.id,
    datetime: job.datetime,
    description: job.description,
    command: job.command,
    entry: jobOnDisk?.entry || undefined,
  };
}
