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
    contentCategories: string[]; // Movies, TV shows, etc, or empty string for TV channels
  }
  