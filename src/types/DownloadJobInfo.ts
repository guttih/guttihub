// src/types/DownloadJobInfo.ts
import { DownloadJob } from "./DownloadJob";
import { M3UEntry } from "./M3UEntry";

export interface DownloadJobInfo {
  job: DownloadJob;
  entry: M3UEntry;
  logs: string[];
  status: Record<string, string | string[]>;
}
