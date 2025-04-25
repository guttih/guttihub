import { getRecordingJobsDir, readCashedEntryFile } from "@/utils/fileHandler";
import { RecordingJob } from "@/types/RecordingJob";
import { parseLatestStatus } from "@/utils/resolverUtils";
import path from "path";
import fs from "fs/promises";

export { readCashedEntryFile as getEntryByCacheKey };

/**
 * Return all RecordingJobs whose last STATUS is "live" or "recording".
 */
export async function getActiveLiveJobs(): Promise<RecordingJob[]> {
    const dir = getRecordingJobsDir();
    let files: string[];
    try {
        files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
    } catch {
        return [];
    }

    const active: RecordingJob[] = [];
    await Promise.all(
        files.map(async (file) => {
            const fullPath = path.join(dir, file);
            let job: RecordingJob;
            try {
                const txt = await fs.readFile(fullPath, "utf-8");
                job = JSON.parse(txt) as RecordingJob;
            } catch {
                return;
            }

            // If statusFile is missing, skip
            try {
                await fs.access(job.statusFile);
            } catch {
                return;
            }

            // Parse only the latest STATUS
            const raw = await fs.readFile(job.statusFile, "utf-8");
            const status = parseLatestStatus(raw).STATUS;

            if (status === "live" || status === "recording") {
                active.push(job);
            }
        })
    );

    return active;
}
