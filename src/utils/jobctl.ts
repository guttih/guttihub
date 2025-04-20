// src/utils/jobctl.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { JobctlResult } from "@/types/Jobctl";

const exec = promisify(execFile);
const JOBCTL = process.env.JOBCTL_PATH ?? "src/scripts/jobctl.sh";

export async function runJobctl(...args: string[]): Promise<JobctlResult> {
  try {
    const { stdout } = await exec(JOBCTL, args, { timeout: 60_000 });
    return JSON.parse(stdout.toString()) as JobctlResult;
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
