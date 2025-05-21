// src/utils/LiveWatcher.ts
import { listActiveStreams, getViewerCount, shouldAutoStop } from "./liveViewers";
import { getScriptPath, readRecordingJobFile } from "./fileHandler";
import { spawn } from "child_process";

const CHECK_INTERVAL_MS = 10_000;
const stopScript = getScriptPath("stop-record.sh");

let active = false;

export function startLiveWatcher() {
  if (active) return;
  active = true;
  console.log("🔁 LiveWatcher started...");

  setInterval(async () => {
    const recordingIds = listActiveStreams();
    for (const id of recordingIds) {
      const count = getViewerCount(id);
      if (count > 0) continue;

      const shouldStop = await shouldAutoStop(id);
      if (!shouldStop) continue;

      try {
        const job = await readRecordingJobFile(id);
        console.log(`👋 No viewers on ${id}, auto-stopping...`);

        const stop = spawn(stopScript, ["--outputFile", job.outputFile], {
          stdio: "ignore",
          detached: true,
        });
        stop.unref();
      } catch (err) {
        console.error(`❌ Failed to stop ${id}:`, err);
      }
    }
  }, CHECK_INTERVAL_MS);
}
