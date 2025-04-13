export interface FetchM3URequest {
    url: string;
    snapshotId?: string;
    filters?: {
      name?: string;
      groupTitle?: string;
      tvgId?: string;
      format?: string;
      category?: string;
    };
    pagination?: {
        offset: number;
        limit?: number;
      };
  }
  