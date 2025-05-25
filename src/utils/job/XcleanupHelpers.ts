// src/utils/job/XcleanupHelpers.ts

import fs from "fs/promises";
import path from "path";
import { promises as fsSync } from "fs";

import { fileExists, deleteFileAndForget, readJsonFile } from "@/utils/fileHandler";
import { getCacheDir, getJobsDir, getWorkDir, getMediaDir } from "@/utils/fileHandler";
import { Job } from "@/types/Job";
import { appConfig } from "@/config/index";
import { DownloadJob } from "@/types/DownloadJob";
import { RecordingJob } from "@/types/RecordingJob";
import { CleanupCandidate } from "@/types/CleanupCandidate";
import { isProcessAlive } from "@/utils/process";
import { getLatestStatus } from "@/utils/statusHelpers"; // legacy; might move to XjobStatusHelpers
import { XnormalizeStatus } from "./XjobStatusHelpers";

export async function XdeleteOldDanglingJobs(force = false): Promise<void> {
    const ageMs = force ? 0 : appConfig.minCleanupAgeMs;
    console.log(`🧹 Deleting old ghost jobs older than ${ageMs / 1000 / 60}min…`);

    await Promise.all([XcleanOldCacheFiles(ageMs), XcleanOldJobInfoFiles(ageMs), XcleanOrphanedWorkFiles(ageMs), XcleanOrphanedMediaJson(ageMs)]);
}

export async function XfindJobsToCleanup(force = false): Promise<CleanupCandidate[]> {
    const dir = getJobsDir();
    const now = Date.now();
    const maxAge = force ? 0 : appConfig.minCleanupAgeMs;

    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json") && !f.includes("-info"));
    const result: CleanupCandidate[] = [];

    for (const file of files) {
        const filePath = path.join(dir, file);
        const job = await readJsonFile<DownloadJob | RecordingJob>(filePath);
        const age = now - (await fs.stat(filePath)).mtimeMs;
        const infoPath = path.join(dir, `${job.recordingId}-info.json`);
        const final = job.finalOutputFile;

        if (!force && (await fileExists(infoPath)) && (await fileExists(final))) continue;
        if (age < maxAge && !force) continue;

        const status = await readJsonFile(job.statusFile).catch(() => ({}));
        const state = XnormalizeStatus(getLatestStatus(status.STATUS));
        const pid = parseInt(getLatestStatus(status.PID) || "0", 10);
        const alive = await isProcessAlive(pid);

        if (!(await fileExists(infoPath)) && !(await fileExists(final))) {
            result.push({ job, reason: "ghost", fullPath: filePath });
        } else if (!alive && !["done", "stopped", "error"].includes(state)) {
            result.push({ job, reason: "zombie", fullPath: filePath });
        } else if (["done", "stopped", "error"].includes(state)) {
            result.push({ job, reason: "done", fullPath: filePath });
        } else if (force) {
            result.push({ job, reason: "forced", fullPath: filePath });
        }
    }

    return result;
}

// Individual helpers below ⤵

async function XcleanOldCacheFiles(maxAgeMs: number) {
    const dir = getCacheDir();
    const files = await fs.readdir(dir);
    const jobs = new Set((await fs.readdir(getJobsDir())).map((f) => f.replace(/\.json$/, "")));

    for (const file of files) {
        if (!file.startsWith("cache-") || !file.endsWith(".json")) continue;
        const full = path.join(dir, file);
        const base = file.replace(/\.json$/, "");
        const stat = await fs.stat(full);
        if (Date.now() - stat.mtimeMs > maxAgeMs && !jobs.has(base)) {
            console.log(`🪓 Orphan cache: ${file}`);
            await deleteFileAndForget(full);
        }
    }
}

async function XcleanOldJobInfoFiles(maxAgeMs: number) {
    const dir = getJobsDir();
    const files = await fs.readdir(dir);

    for (const file of files) {
        if (!file.endsWith("-info.json")) continue;
        const full = path.join(dir, file);
        const mediaFile = path.join(getMediaDir(), file.replace("-info.json", "") + ".json");
        const stat = await fs.stat(full);

        if (Date.now() - stat.mtimeMs > maxAgeMs && !(await fileExists(mediaFile))) {
            console.log(`🪓 Stale info: ${file}`);
            await deleteFileAndForget(full);
        }
    }
}

async function XcleanOrphanedWorkFiles(maxAgeMs: number) {
    const dir = getWorkDir();
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const known = new Set((await fs.readdir(getJobsDir())).map((f) => f.replace(/\.json$/, "")));

    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        const age = Date.now() - (await fs.stat(full)).mtimeMs;

        if (entry.isFile() && /\.(log|status|part)$/.test(entry.name)) {
            const base = entry.name.replace(/\.(log|status|part)$/, "").replace(/\.\w+$/, "");
            if (age > maxAgeMs && !known.has(base)) {
                console.log(`🧹 Orphan work file: ${entry.name}`);
                await deleteFileAndForget(full);
            }
        }

        if (entry.isDirectory() && entry.name.endsWith("_hls")) {
            const base = entry.name.replace(/-?playlist?_?hls$/, "");
            if (age > maxAgeMs && !known.has(base)) {
                console.log(`🧼 Orphan HLS dir: ${entry.name}`);
                await fs.rm(full, { recursive: true, force: true });
            }
        }
    }
}

async function XcleanOrphanedMediaJson(maxAgeMs: number) {
    const dir = getMediaDir();
    const files = await fs.readdir(dir);

    for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const full = path.join(dir, file);
        const correspondingMedia = full.replace(/\.json$/, "");

        const stat = await fs.stat(full);
        if (Date.now() - stat.mtimeMs > maxAgeMs && !(await fileExists(correspondingMedia))) {
            console.log(`🧼 Orphan media .json: ${file}`);
            await deleteFileAndForget(full);
        }
    }
}
