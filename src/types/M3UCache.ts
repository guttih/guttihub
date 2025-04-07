import { M3UEntry } from '@/types/M3UEntry';

export interface M3UCache {
  entries: M3UEntry[];
  fetchedAt: number; // UNIX timestamp (ms)
}
