import { M3UEntry } from "./M3UEntry";

export interface CashedEntries {
    snapshotId: string; // Unique ID for the snapshot
    timeStamp: string; // Timestamp of when the snapshot was taken (in milliseconds since epoch)
    entries: M3UEntry[]; // Array of M3UEntry objects
    formats: string[]; // Array of formats available in the snapshot
    categories: string[]; // Array of categories available in the snapshot
    servers: string[]; // Array of server URLs available in the snapshot
}
