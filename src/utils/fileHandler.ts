import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = path.resolve(process.cwd(), 'public/cache');

export function  getCacheDir(): string {
  return CACHE_DIR;
}

//todo: Makesure all paths will work on all OS

export async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as T;
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, content, "utf-8");
}

export async function fileExists(filePath: string) {
    await fs.access(filePath).catch(() => {
        return false;
    }, 
);
return true;

}

export function getCacheFilePath(username: string, serviceName: string, extension:string): string {
  const safeService = serviceName.toLowerCase().replace(/\s+/g, '_');
  return path.join(CACHE_DIR, `${username}_${safeService}.${extension}`);
}

export async function isFileFresh(filePath: string, maxAgeMs: number): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return Date.now() - stat.mtimeMs < maxAgeMs;
  } catch {
    return false;
  }
}

export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content);
}

export function getProjectCacheDir(): string {
  return CACHE_DIR;
}
