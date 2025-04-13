// types/M3UResponse.ts
import { M3UEntry } from "./M3UEntry";
import { ContentCategoryFieldLabel } from "./ContentCategoryFieldLabel";
import { StreamingService } from "./StreamingService";

type ServerUrl = StreamingService["server"];

export interface M3UResponse {
    snapshotId: string;
    timeStamp: string;
    entries: M3UEntry[];
    formats?: string[];
    categories?: ContentCategoryFieldLabel[];
    servers?: ServerUrl[]; 
    pagination: {
        offset: number;
        limit: number;
    };
    totalPages : number;
    totalItems: number;
  }

// Helper function to help with printing the M3U response so you only print the first 2 entries
// and the rest of the data
// This is useful for debugging and testing purposes
 export function makePrintableM3UResponse(response: unknown): M3UResponse {
    const m3uResponse: M3UResponse = response as unknown as M3UResponse;

    return {
        snapshotId: m3uResponse.snapshotId,
        timeStamp: m3uResponse.timeStamp,
        entries: m3uResponse.entries && m3uResponse.entries.length > 0 ? [m3uResponse.entries[0], m3uResponse.entries[1]] : [],
        formats: m3uResponse.formats,
        categories: m3uResponse.categories,
        servers: m3uResponse.servers,
        pagination: {
            offset: m3uResponse.pagination.offset,
            limit: m3uResponse.pagination.limit,
        },
        totalPages: m3uResponse.totalPages,
        totalItems: m3uResponse.totalItems,
    };
}