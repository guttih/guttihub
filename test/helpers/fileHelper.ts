import path from "path";
import { promises as fs, readFileSync } from "fs";

/**
 * Resolves the full path to a test asset in test/assets/
 */
export function getAssetPath(filename: string): string {
    return path.resolve(process.cwd(), "test/assets", filename);
}

/**
 * Reads and returns the UTF-8 content of a test asset file
 */
export async function readFileAsset(filename: string): Promise<string> {
    const filePath = getAssetPath(filename);
    return fs.readFile(filePath, "utf-8");
}

export function readFileAssetSync(filename: string): string {
    return readFileSync(getAssetPath(filename), "utf-8");
}
