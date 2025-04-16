import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";
import { M3UEntry } from "@/types/M3UEntry";

const execAsync = promisify(execFile);

export class ScheduleResolver {
    static recordScript = path.resolve("src/scripts/record.sh");

    static async scheduleRecording(params: {
        entry: M3UEntry;
        startTime: string;
        durationSec: number;
        user: string;
        outputFile: string;
        recordNow?: boolean;
    }): Promise<{ success: boolean; message?: string; error?: string }> {
        const { entry, durationSec, user, outputFile, recordNow } = params;

        const args = ["--url", entry.url, "--duration", durationSec.toString(), "--user", user, "--outputFile", outputFile, "--format", "mp4"];

        if (recordNow) {
            try {
                const { stdout } = await execAsync("bash", [ScheduleResolver.recordScript, ...args]);
                return { success: true, message: stdout.trim() };
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                return { success: false, error: message };
            }
        }

        // Fallback to normal scheduling...
        return { success: false, error: "Only recordNow is implemented in this test" };
    }
}
