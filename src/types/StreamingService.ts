export interface StreamingService {
    id: string;
    name: string;
    server: string;
    refreshUrl: string;
    viewingBaseUrl: string;
    username: string;
    password: string;
    contentCategories: string[]; // Movies, TV shows, etc, or empty string for TV channels
  }
  