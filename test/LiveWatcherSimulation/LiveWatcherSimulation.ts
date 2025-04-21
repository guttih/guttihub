// test/LiveWatcherSimulation/LiveWatcherSimulation.ts
import { trackViewer, getViewerCount } from "@/utils/liveViewers";
import { writeRecordingJobFile } from "@/utils/fileHandler";
import { startLiveWatcher } from "@/utils/LiveWatcher";
import { resetViewers } from "@/utils/liveViewers";

const RECORDING_ID = "recording-test123";
const OUTPUT_FILE = "/tmp/fake-recording.mp4";

function clearViewers(recordingId: string) {
    resetViewers(recordingId);
  }

export async function simulateViewerSequence(sequence: number[], delayMs = 3000) {
  console.log("🎬 Simulating viewer sequence...");

  await writeRecordingJobFile({
    recordingId: RECORDING_ID,
    cacheKey: "fakekey",
    user: "tester",
    outputFile: OUTPUT_FILE,
    logFile: OUTPUT_FILE + ".log",
    statusFile: OUTPUT_FILE + ".status",
    duration: 0,
    format: "hls-live",
    startTime: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    recordingType: "hls"
  });

  startLiveWatcher();

  for (let i = 0; i < sequence.length; i++) {
    const viewerCount = sequence[i];
    console.log(`👁️ Step ${i + 1}: ${viewerCount} viewer(s)`);
  
    // 💥 Reset before each step to simulate leaving + joining
    clearViewers(RECORDING_ID);
  
    for (let v = 1; v <= viewerCount; v++) {
      trackViewer(RECORDING_ID, `192.168.1.${v}`);
    }
  
    console.log("👥 Current tracked:", getViewerCount(RECORDING_ID));
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  

  console.log("⌛ Sequence complete. Waiting 15s to ensure timeout triggers...");
  await new Promise((resolve) => setTimeout(resolve, 15000));
}
