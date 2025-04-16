// src/config/index.ts

import { StreamingService } from "@/types/StreamingService";
import servicesJson from "./services.json";
import authorizedUsersJson from "./authorizedUsers.json";

// --- Static config: always safe to export ---
const services: StreamingService[] = servicesJson;

interface AppConfigType {
  appName: string;
  defaultPageSize: number | string;
  fallbackImage: string;
  hideCredentialsInUrl: boolean;
  maxEntryExportCount: number;
}

export const appConfig: AppConfigType = {
  appName: "Guttihub Stream",
  defaultPageSize: 60,
  fallbackImage: "/fallback.png",
  hideCredentialsInUrl: false,
  maxEntryExportCount: 59,
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
