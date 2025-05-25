import { getCacheDir } from "@/utils/fileHandler";
import { fileExists, readJsonFile } from "@/utils/fileHandler";
import { M3UEntry } from "@/types/M3UEntry";

/**
 * Loads an M3UEntry from the .cache/<cacheKey>.json file if it exists.
 */
export async function XreadCashedEntryFile(cacheKey: string): Promise<M3UEntry | null> {
    const filePath = `${getCacheDir()}/${cacheKey}.json`;
    if (!(await fileExists(filePath))) return null;

    try {
        return await readJsonFile<M3UEntry>(filePath);
    } catch (err) {
        console.warn(`⚠️ Failed to load entry cache: ${filePath}`, err);
        return null;
    }
}

/**
 * Resolves job.entry reliably: from job object or fallback cache.
 */
export async function XresolveJobEntry(entry: M3UEntry | undefined, cacheKey: string): Promise<M3UEntry | null> {
    return entry ?? (await XreadCashedEntryFile(cacheKey));
}
