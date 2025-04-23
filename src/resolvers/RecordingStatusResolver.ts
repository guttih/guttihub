// src/resolvers/RecordingStatusResolver.ts
import path from "path";
import { existsSync } from "fs";
import {
  getRecordingJobsDir,
  readFile,
  readJsonFile,
} from "@/utils/fileHandler";
import { RecordingJob } from "@/types/RecordingJob";
import { RecordingJobInfo } from "@/types/RecordingJobInfo";
import { RecordingStatus } from "@/types/RecordingStatus";
import {
  parseLatestStatus,
  normalizeStatus,
} from "@/utils/resolverUtils";

export class RecordingStatusResolver {
  /**
   * Load the single-source bundle if it exists, otherwise parse the live .status.
   * Returns a fully flattened RecordingStatus.
   */
  static async getStatusByRecordingId(
    recordingId: string
  ): Promise<RecordingStatus> {
    const dir      = getRecordingJobsDir();
    const infoPath = path.join(dir, `${recordingId}-info.json`);

    let flatMap: Record<string, string>;

    if (existsSync(infoPath)) {
      // Finished-job bundle
      const info = await readJsonFile<RecordingJobInfo>(infoPath);
      flatMap = {};
      for (const [k, v] of Object.entries(info.status)) {
        flatMap[k] = Array.isArray(v) ? v[v.length - 1] : v;
      }
    } else {
      // In-flight or not-yet-bundled
      const jobFile = path.join(dir, `${recordingId}.json`);
      let job: RecordingJob;
      try {
        job = await readJsonFile<RecordingJob>(jobFile);
      } catch (err) {
        if (
          err instanceof Error &&
          (err as NodeJS.ErrnoException).code === "ENOENT"
        ) {
          return { status: "unknown" };
        }
        throw err;
      }

      let rawStatus: string;
      try {
        rawStatus = await readFile(job.statusFile);
      } catch (err) {
        console.warn(
          "❌ Failed to read .status file for",
          recordingId,
          err
        );
        return { status: "unknown" };
      }
      flatMap = parseLatestStatus(rawStatus);
    }

    // Normalize and build DTO
    const raw = flatMap["STATUS"] ?? "unknown";
    const final = normalizeStatus(raw);

    const dto: RecordingStatus = {
      status:       final,
      startedAt:    flatMap["STARTED_AT"],
      expectedStop: flatMap["EXPECTED_STOP"],
      stream:       flatMap["STREAM"],
      user:         flatMap["USER"],
      duration:     flatMap["DURATION"],
      outputFile:   flatMap["OUTPUT_FILE"],
      logFile:      flatMap["LOG_FILE"],
      serverTime:   new Date().toISOString(),
    };

    return dto;
  }
}
