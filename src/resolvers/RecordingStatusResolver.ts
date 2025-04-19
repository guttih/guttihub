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
    serverTime?: string;
}

export class RecordingStatusResolver {
    static async getStatusByRecordingId(recordingId: string): Promise<Record<string, string>> {
        try {
            const jobsDir = getRecordingJobsDir();
            const jobPath = path.join(jobsDir, `${recordingId}.json`);
            const job = await readJsonFile<RecordingJob>(jobPath);

            const statusContent = await readFile(job.statusFile);
            const map: Record<string, string> = {};
            let lastStatusLine: string | undefined = undefined;

            for (const line of statusContent.split("\n")) {
                const [key, ...rest] = line.split("=");
                if (key && rest.length > 0) {
                    const k = key.trim();
                    const v = rest.join("=").trim();

                    if (k === "STATUS") {
                        lastStatusLine = v;
                    } else {
                        map[k] = v;
                    }
                }
            }

            if (lastStatusLine) {
                map["STATUS"] = lastStatusLine;
            }
            map["SERVER_TIME"] = new Date().toISOString();
            return map;
        } catch (err) {
            console.warn("❌ Failed to load status by recordingId:", recordingId, err);
            return { STATUS: "unknown", ERROR: "Could not read .status file" };
        }
    }
    static stringMapToRecordingStatus(statusMap: Record<string, string>): RecordingStatus {
        const status: RecordingStatus = {
            status: statusMap["STATUS"] as "recording" | "done" | "error" | "unknown",
            startedAt: statusMap["STARTED_AT"],
            expectedStop: statusMap["EXPECTED_STOP"],
            stream: statusMap["STREAM"],
            user: statusMap["USER"],
            duration: statusMap["DURATION"],
            outputFile: statusMap["OUTPUT_FILE"],
            logFile: statusMap["LOG_FILE"],
            serverTime: statusMap["SERVER_TIME"],
        };
        return status;
    }
}
