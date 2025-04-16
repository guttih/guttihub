import { describe, it, expect } from "vitest";
import path from "path";
import { StatusResolver } from "@/resolvers/StatusResolver";
import fs from "fs/promises";

describe("StatusResolver", () => {
  it("parses a real .status file", async () => {
    const id = "recording-test-valid-" + Date.now();
    const tmpDir = path.resolve("test/assets/tmp");
    const statusPath = path.join(tmpDir, `${id}.mp4.status`);

    const content = `
STATUS=done
STARTED_AT=2025-04-16T18:00:00Z
EXPECTED_STOP=2025-04-16T18:00:20Z
STREAM=http://example.com/stream
USER=testuser
DURATION=20
OUTPUT_FILE=${tmpDir}/${id}.mp4
LOG_FILE=${tmpDir}/${id}.mp4.log
`;

    await fs.writeFile(statusPath, content.trim());

    const result = await StatusResolver.getStatus(id, tmpDir);

    expect(result.status).toBe("done");
    expect(result.user).toBe("testuser");
    expect(result.stream).toContain("example.com");
    expect(result.startedAt).toMatch(/^2025-/);
  });

  it("returns unknown for missing file", async () => {
    const result = await StatusResolver.getStatus("nonexistent-file", "test/assets/tmp");
    expect(result.status).toBe("unknown");
  });
});
