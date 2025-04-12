// utils/m3uGenerator.ts

import { M3UEntry } from "@/types/M3UEntry";

export function generateM3U(entries: M3UEntry[]): string {
  const header = "#EXTM3U";
  const lines = entries.map((entry) => {
    const info = `#EXTINF:-1 tvg-id=\"${entry.tvgId}\" tvg-name=\"${entry.tvgName}\" tvg-logo=\"${entry.tvgLogo}\" group-title=\"${entry.groupTitle}\",${entry.name}`;
    return `${info}\n${entry.url}`;
  });
  return [header, ...lines].join("\n");
}
