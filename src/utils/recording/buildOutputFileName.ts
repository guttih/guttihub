import path from "path";
import { M3UEntry } from "@/types/M3UEntry";

export function buildOutputFileName(entry: M3UEntry, outputDir: string, extension: string = "mp4"): string {
  const dateStr = new Date().toISOString().slice(2, 19).replace(/[-:]/g, "").replace("T", "T");
  const streamId = entry.url.trim().split("/").filter(Boolean).pop() ?? "unknown";
  const fileName = `recording-${dateStr}-${streamId}.${extension}`;
  return path.resolve(outputDir, fileName);
}
