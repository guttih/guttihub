import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";

const execAsync = promisify(execFile);
const scriptPath = path.resolve("src/scripts/record.sh");
const testDir = path.resolve("test/assets/tmp");

function createOutputFileName(id: string) {
  return path.join(testDir, `recording-test-${id}.mp4`);
}

describe("record.sh format handling", () => {
  it("accepts format=mp4 and writes a .status file", async () => {
    const id = Date.now().toString();
    const outputFile = createOutputFileName(id);
    const outputDir = path.dirname(outputFile);

    const args = [
      "--url", "http://example.com/fake-stream",
      "--duration", "1",
      "--user", "guttih",
      "--outputFile", outputFile,
      "--format", "mp4",
    ];

    await execAsync("bash", [scriptPath, ...args]);

    const files = await fs.readdir(outputDir);
    const statusFile = files.find((f) => f.includes(id) && f.endsWith(".status"));
    expect(statusFile).toBeDefined();

    const statusContent = await fs.readFile(path.join(outputDir, statusFile!), "utf-8");
    expect(statusContent).toContain("STATUS=");
  });

  it("rejects unsupported format", async () => {
    const id = "badformat-" + Date.now();
    const outputFile = createOutputFileName(id);
    const outputDir = path.dirname(outputFile);

    const args = [
      "--url", "http://example.com/fake-stream",
      "--duration", "1",
      "--user", "guttih",
      "--outputFile", outputFile,
      "--format", "ogg",
    ];

    let errorThrown = false;
    try {
      await execAsync("bash", [scriptPath, ...args]);
    } catch {
      errorThrown = true;
    }

    expect(errorThrown).toBe(true);

    const statusPath = path.join(outputDir, `recording-test-${id}.mp4.status`);
    const statusContent = await fs.readFile(statusPath, "utf-8");
    expect(statusContent).toContain("STATUS=error");
  });
});
