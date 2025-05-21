// src/types/MovieConsumerMeta.ts
import { M3UEntry } from "./M3UEntry";

// src/types/MovieConsumerMeta.ts
export type MovieConsumerMeta = {
    serviceId: string;
    lastSeen: number;
    entry: M3UEntry;
};
