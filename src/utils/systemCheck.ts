// src/utils/systemCheck.ts

import { exec } from "child_process";

export async function checkSystemDependencies(): Promise<{
  success: boolean;
  missing: string[];
  output: Record<string, string>;
  message: string;
}> {
  const requiredTools = ["at", "curl", "ffmpeg", "jq"];
  const results: Record<string, string> = {};
  const missing: string[] = [];

  // Validate BASE_URL
  const baseUrl = process.env.BASE_URL;
  const isValidUrl = baseUrl?.startsWith("http://") || baseUrl?.startsWith("https://");

  if (!baseUrl) {
    results["BASE_URL"] = ""; // empty string = falsy = ❌
    missing.push("BASE_URL");
  } else if (!isValidUrl) {
    results["BASE_URL"] = ""; // invalid URL = still ❌
    missing.push("BASE_URL");
  } else {
    results["BASE_URL"] = `${baseUrl}`; // ✅
  }
  

  // Check required system tools
  for (const tool of requiredTools) {
    try {
      const { stdout } = await execAsync(`command -v ${tool}`);
      const path = stdout.trim();
      results[tool] = `${tool} is installed at ${path}`;
    } catch {
      results[tool] = `${tool} is not installed`;
      missing.push(tool);
    }
  }

  const summaryMessage =
    missing.length === 0
      ? "✅ All system dependencies are installed and BASE_URL is set."
      : `⚠️ Missing ${missing.length} item(s): ${missing.join(", ")}`;

  return {
    success: missing.length === 0,
    missing,
    output: results,
    message: summaryMessage,
  };
}

// Helper for async exec
function execAsync(command: string): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    exec(command, (error: Error | null, stdout: string) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout });
      }
    });
  });
}
