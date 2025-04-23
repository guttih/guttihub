import { fileExists, getCacheDir, getRecordingJobsDir, readJsonFile } from "@/utils/fileHandler";
import { M3UEntry } from "@/types/M3UEntry";
import { RecordingJob } from "@/types/RecordingJob";
import { parseLatestStatus } from "@/utils/resolverUtils";
import path from "path";
import fs from "fs/promises";

export async function getEntryByCacheKey(cacheKey: string): Promise<M3UEntry | null> {
    const dir = getCacheDir();
    const recordingPath = `${dir}/recording_${cacheKey}.json`;
    const entryPath = `${dir}/${cacheKey}.json`;

    try {
        let entry: M3UEntry;
        if (await fileExists(recordingPath)) {
            // console.log("🔍 Found recording file:", recordingPath);
            entry = await readJsonFile<M3UEntry>(recordingPath);
        } else if (await fileExists(entryPath)) {
            // console.log("🔍 Found entry file:", entryPath);
            entry = await readJsonFile<M3UEntry>(entryPath);
        } else {
            // console.warn("❌ No cache file found for:", cacheKey);
            return null;
        }

        return entry;
    } catch {
        return null;
    }
}

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
