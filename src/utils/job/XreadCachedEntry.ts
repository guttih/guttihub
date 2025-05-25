// src/utils/job/XreadCachedEntry.ts

import path from "path";
import { fileExists, readJsonFile, getCacheDir } from "@/utils/fileHandler";
import { M3UEntry } from "@/types/M3UEntry";

export async function XreadCachedEntry(cacheKey: string): Promise<M3UEntry | null> {
    const pathToEntry = path.join(getCacheDir(), `${cacheKey}.json`);
    if (!(await fileExists(pathToEntry))) return null;
    try {
        return await readJsonFile<M3UEntry>(pathToEntry);
    } catch {
        return null;
    }
}
