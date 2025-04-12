// src/config/index.ts
import { StreamingService } from "@/types/StreamingService";
import servicesJson from "./services.json";

const services: StreamingService[] = servicesJson;



interface AppConfigType {
    appName: string;                  // Display Name of the application
    defaultPageSize: number | string; // Allows both number and string
    fallbackImage: string;            // Path to the fallback image for missing images of M3U entries
    hideCredentialsInUrl: boolean;    // Show or hide credentials in URL client-side
    maxEntryExportCount: number;      // Maximum number of entries to export at once
}

// Use the defined type for AppConfig
export const appConfig: AppConfigType = {
    appName: "Guttihub Stream",
    defaultPageSize: 60,
    fallbackImage: "/fallback.png",
    hideCredentialsInUrl: false,
    maxEntryExportCount: 200,
};



export { services };

