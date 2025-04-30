// src/utils/jobctl.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { JobctlError, JobctlGetSuccess, JobctlListSuccess, JobctlResult } from "@/types/Jobctl";
import { getScriptPath } from "./fileHandler";

const exec = promisify(execFile);
const JOBCTL = getScriptPath("jobctl.sh");

/**
 * Runs the `jobctl` bash script to manage scheduled recording jobs.
 *
 * This function wraps a shell script that interfaces with `at(1)` to:
 *   - Add a new job (to be executed at a future datetime)
 *   - List all jobs tagged with #guttihub
 *   - Delete a job by ID or description match
 *
 * It expects a `jobctl.sh` script at the path specified by the `JOBCTL_PATH`
 * environment variable, or defaults to `src/scripts/jobctl.sh`.
 *
 * Examples:
 *
 *   await runJobctl("list");
 *   await runJobctl("add", "2025-05-02 02:15", "grab snapshot", "echo 'snap!' > /tmp/snap.log");
 *   await runJobctl("delete", "13"); // or "delete", "grab snapshot"
 *
 * Returns a parsed JSON object with the following structure (on success):
 *   { ok: true, jobs: [...] }      // for list
 *   { ok: true, job: {...} }       // for add
 *   { ok: true, deleted: [...] }   // for delete
 *
 * On error (e.g., bad date format, missing args, invalid command), returns:
 *   { ok: false, error: "Some message" }
 *
 * Note: Shell script has a 60s timeout and will throw if it hangs or fails hard.
 */

export async function runJobctl(...args: string[]): Promise<JobctlResult> {
    try {
        const { stdout } = await exec(JOBCTL, args, { timeout: 60_000 });
        return JSON.parse(stdout.toString()) as JobctlResult;
    } catch (err) {
        return { ok: false, error: (err as Error).message };
    }
}

export async function getJobByIdFromJobCtrl(id: string): Promise<JobctlGetSuccess | JobctlError> {
    const result = (await runJobctl("list")) as JobctlError | JobctlListSuccess;
    if (result.ok && "jobs" in result && result.jobs.length > 0) {
        const job = result.jobs.find((job) => job.id === id);
        if (job) {
            return { ok: true, job };
        }
    }
    return { ok: false, error: `Job ${id} not found` };
}
