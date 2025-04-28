// src/utils/process.ts

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Check if a process with given PID is alive.
 * Works on Linux and macOS.
 */
export async function isProcessAlive(pid: number): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`ps -p ${pid} -o pid=`);
    return stdout.trim() !== "";
  } catch (err) {
    return false; // Assume not alive on error
  }
}
