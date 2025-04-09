import { M3UEntry } from "@/types/M3UEntry";
import { StreamingService } from "@/types/StreamingService";
import { parseM3U } from "@/utils/parseM3U";
import { FetchM3URequest } from "@/types/FetchM3URequest";
import { sanitizeM3UUrls } from "@/utils/urlSanitizer";
import { appConfig } from "@/config";

export async function fetchAndParseM3U(service: StreamingService): Promise<M3UEntry[]|undefined> {
    try {
        const payload: FetchM3URequest = {
            url: service.refreshUrl,
            username: service.username,
            serviceName: service.name,
        };
        const apiResponse = await fetch("/api/fetch-m3u", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        const json = await apiResponse.json();

        if (!apiResponse.ok) {
            const errorMessage = json.error || "Failed to fetch M3U";
            console.error("[FETCH ERROR]", errorMessage);
            throw new Error(errorMessage);
        }

        const parsedEntries = parseM3U(json.data);

        if (appConfig.hideCredentialsInUrl && parsedEntries) {
            return sanitizeM3UUrls(parsedEntries, service.username, service.password);
        }
        

        return parsedEntries;
    } catch (error: unknown) {
        if (error instanceof Error) {
          console.error('Error:', error.message);
        } else {
          console.error('Unknown error caught:', error);
        }
    }

}
