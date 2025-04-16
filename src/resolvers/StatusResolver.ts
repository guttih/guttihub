import path from "path";
import { readFile } from "@/utils/fileHandler";

export interface RecordingStatus {
  status: "recording" | "done" | "error" | "unknown";
  startedAt?: string;
  expectedStop?: string;
  stream?: string;
  user?: string;
  duration?: string;
  outputFile?: string;
  logFile?: string;
}

export class StatusResolver {
  static async getStatus(recordingId: string, outputDir: string): Promise<RecordingStatus> {
    const statusPath = path.resolve(outputDir, `${recordingId}.mp4.status`);



    try {
      const content = await readFile(statusPath);
      const lines = content.split("\n");
      const map: Record<string, string> = {};

      for (const line of lines) {
        const [key, ...rest] = line.split("=");
        if (key && rest.length > 0) {
          map[key.trim()] = rest.join("=").trim(); // Preserve '=' in values
        }
      }

      return {
        status: (map["STATUS"] as RecordingStatus["status"]) || "unknown",
        startedAt: map["STARTED_AT"],
        expectedStop: map["EXPECTED_STOP"],
        stream: map["STREAM"],
        user: map["USER"],
        duration: map["DURATION"],
        outputFile: map["OUTPUT_FILE"],
        logFile: map["LOG_FILE"],
      };
    } catch  {
      console.warn(`⚠️ Could not read status file: ${statusPath}`);
      return { status: "unknown" };
    }
  }
}
