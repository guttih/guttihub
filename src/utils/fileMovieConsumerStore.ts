// src/utils/fileMovieConsumerStore.ts
import fs from "fs/promises";
import path from "path";
import { MovieConsumerMeta } from "@/types/MovieConsumerMeta";
import { getCacheDir } from "@/utils/fileHandler";

const FILE_PATH = path.join(getCacheDir(), "movie-consumers.json");
export async function readConsumers(): Promise<Record<string, MovieConsumerMeta>> {
    try {
        const content = await fs.readFile(FILE_PATH, "utf-8");
        return JSON.parse(content);
    } catch {
        // File doesn't exist or can't be parsed — return empty quietly
        return {};
    }
}

export async function writeConsumers(consumers: Record<string, MovieConsumerMeta>): Promise<void> {
    await fs.writeFile(FILE_PATH, JSON.stringify(consumers, null, 2), "utf-8");
}
