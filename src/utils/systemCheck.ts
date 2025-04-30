// src/utils/systemCheck.ts

import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

const requiredTools = ["at", "curl", "ffmpeg", "jq"];

export async function checkSystemDependencies(): Promise<{
  success: boolean;
  missing: string[];
  output: Record<string, string | null>;
}> {
  const results: Record<string, string | null> = {};
  const missing: string[] = [];

  for (const tool of requiredTools) {
    try {
      const { stdout } = await execAsync(`command -v ${tool}`);
      results[tool] = stdout.trim();
    } catch {
      results[tool] = null; // 👈 mark as missing
      missing.push(tool);
    }
  }

//   const FORCE_FAILURE = true;
//   if (FORCE_FAILURE) {
//     // 👹 Lying here: fake that ffmpeg and jq are missing
//     results["ffmpeg"] = null;
//     results["jq"] = null;

//     if (!missing.includes("ffmpeg")) missing.push("ffmpeg");
//     if (!missing.includes("jq")) missing.push("jq");
//   }

  return {
    success: missing.length === 0,
    missing,
    output: results,
  };
}
