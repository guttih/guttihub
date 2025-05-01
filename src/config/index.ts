// src/config/index.ts

import { StreamingService } from "@/types/StreamingService";
import { OutputDirectory } from "@/types/OutputDirectory";
import servicesJson from "./services.json";
import outputDirs from "./output-dirs.json";

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

export { services };
export { outDirectories };
