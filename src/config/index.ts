// src/config/index.ts

import { StreamingService } from "@/types/StreamingService";
import { OutputDirectory } from "@/types/OutputDirectory";
import servicesJson from "./services.json";
import outputDirs from "./output-dirs.json";
import authorizedUsersJson from "./authorizedUsers.json";

// --- Static config: always safe to export ---
const services: StreamingService[] = servicesJson;
const outDirectories: OutputDirectory[] = outputDirs; 
interface AppConfigType {
  appName: string;
  defaultPageSize: number | string;
  fallbackImage: string;
  hideCredentialsInUrl: boolean;
  maxEntryExportCount: number;
  playlistCacheTTLInMs: number; // Maximum time to cache the playlist
  maxRecordingDuration: number; // Maximum recording duration  in seconds for each recording
  
}

export const appConfig: AppConfigType = {
  appName: "Guttihub Stream",
  defaultPageSize: 60,
  fallbackImage: "/fallback.png",
  hideCredentialsInUrl: false,
  maxEntryExportCount: 59,
  maxRecordingDuration: 60 * 60 * 6, // 6 hours
  playlistCacheTTLInMs: 1000 * 60 * 60 * 6, // 6 hours
};

// --- Authorized users lookup ---
const authorizedUsers: Record<string, string> = authorizedUsersJson;

// --- Public runtime helpers ---
export function getUserRole(email?: string | null | undefined): string | null {
  if (!email) {
    console.warn("⚠️ getUserRole called without an email");
    return null;
  }

  return authorizedUsers[email] || null;
}

export { services };
export { outDirectories };
