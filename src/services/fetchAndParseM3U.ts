import { M3UEntry } from "@/types/M3UEntry";
import { StreamingService } from "@/types/StreamingService";
import { m3uParser } from "@/utils/m3uParser";
import { FetchM3URequest } from "@/types/FetchM3URequest";

export async function fetchAndParseM3U(service: StreamingService): Promise<M3UEntry[]> {
    try {
        const payload: FetchM3URequest = {
            url: service.refreshUrl,
            username: service.username,
            serviceName: service.name,
        };
        const apiResponse = await fetch("/api/fetch-m3u", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const json = await apiResponse.json();

        if (!apiResponse.ok) {
            const errorMessage = json.error || "Failed to fetch M3U";
            console.error("[FETCH ERROR]", errorMessage);
            throw new Error(errorMessage);
        }

        const parsedEntries = m3uParser(json.data);

        return parsedEntries;
    } catch (error: any) {
        console.error("[FETCH ERROR]", error.message);
        throw error;
    }
}
