export interface StreamingService {
    id: string;
    name: string;
    server: string;
    refreshUrl: string;
    viewingBaseUrl: string;
    maxConcurrentViewers: number;
    username: string;
    password: string;
    hasFileAccess?: boolean;
    apiType?: "m3u" | "xtream"; // how to fetch entries for this service
    contentCategories: string[]; // Movies, TV shows, etc, or empty string for TV channels
  }
  
