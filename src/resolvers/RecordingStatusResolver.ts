import path from "path";
import { getRecordingJobsDir, readFile, readJsonFile } from "@/utils/fileHandler";
import { RecordingJob } from "@/types/RecordingJob";

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

export class RecordingStatusResolver {
    static async getStatusByRecordingId(recordingId: string): Promise<Record<string, string>> {
        try {
          const jobsDir = getRecordingJobsDir();
          const jobPath = path.join(jobsDir, `${recordingId}.json`);
          const job = await readJsonFile<RecordingJob>(jobPath);
    
          const statusContent = await readFile(job.statusFile);
          const map: Record<string, string> = {};
          for (const line of statusContent.split("\n")) {
            const [key, ...rest] = line.split("=");
            if (key && rest.length > 0) {
              map[key.trim()] = rest.join("=").trim();
            }
          }
    
          return map;
        } catch (err) {
          console.warn("❌ Failed to load status by recordingId:", recordingId, err);
          return { STATUS: "unknown", ERROR: "Could not read .status file" };
        }
      }
    // static async getStatusForCacheKey(cacheKey: string): Promise<RecordingStatus & { log: string }> {
    //     const basePath = path.resolve(".cache", `recording_${cacheKey}.mp4`);
    //     const statusPath = `${basePath}.status`;
    //     const logPath = `${basePath}.log`;
      
    //     let log = "";
    //     try {
    //       log = await readFile(logPath);
    //     } catch {
    //       log = "(no log available)";
    //     }
      
    //     try {
    //       const content = await readFile(statusPath);
    //       const lines = content.split("\n");
    //       const map: Record<string, string> = {};
      
    //       for (const line of lines) {
    //         const [key, ...rest] = line.split("=");
    //         if (key && rest.length > 0) {
    //           map[key.trim()] = rest.join("=").trim();
    //         }
    //       }
      
    //       return {
    //         status: (map["STATUS"] as RecordingStatus["status"]) || "unknown",
    //         startedAt: map["STARTED_AT"],
    //         expectedStop: map["EXPECTED_STOP"],
    //         stream: map["STREAM"],
    //         user: map["USER"],
    //         duration: map["DURATION"],
    //         outputFile: map["OUTPUT_FILE"],
    //         logFile: map["LOG_FILE"],
    //         log, // ✅ new
    //       };
    //     } catch {
    //       console.warn(`⚠️ Could not read status file: ${statusPath}`);
    //       return { status: "unknown", log };
    //     }
    //   }      
}
