import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { getCacheDir } from "@/utils/fileHandler";
import type { DownloadQueueState } from "@/types/DownloadQueue";

// flock releases the lock even if a Next worker crashes. All processes use the same lock.
export async function withQueue<T>(action: (state: DownloadQueueState, save: () => Promise<void>) => Promise<T>): Promise<T> {
    const dir = path.join(getCacheDir(), "download-queue");
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    const holder = spawn("flock", ["-x", "-w", "15", path.join(dir, "queue.lock"), "sh", "-c", "printf ready; cat >/dev/null"], { stdio: ["pipe", "pipe", "ignore"] });
    try {
        await new Promise<void>((resolve, reject) => {
            holder.once("error", reject);
            holder.once("exit", () => reject(new Error("Download queue lock unavailable")));
            holder.stdout.once("data", () => resolve());
        });
        const file = path.join(dir, "queue.json");
        let state: DownloadQueueState;
        try {
            state = JSON.parse(await fs.readFile(file, "utf8"));
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
            state = { running: false, items: [] };
        }
        const save = async () => {
            const temp = `${file}.${process.pid}.tmp`;
            await fs.writeFile(temp, JSON.stringify(state), { mode: 0o600 });
            await fs.rename(temp, file);
        };
        return await action(state, save);
    } finally {
        holder.stdin.end();
    }
}
