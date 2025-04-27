// utils/m3u/safeM3UEntry.ts
import { M3UEntry } from "@/types/M3UEntry";

export function safeM3UEntry(entry: Partial<M3UEntry> | undefined, overrides: Partial<M3UEntry> = {}): M3UEntry {
  return {
    tvgId: entry?.tvgId ?? "",
    tvgName: entry?.tvgName ?? "",
    tvgLogo: entry?.tvgLogo ?? "",
    groupTitle: entry?.groupTitle ?? "",
    name: entry?.name ?? "Unnamed Stream",
    url: entry?.url ?? "",
    ...overrides,
  };
}
