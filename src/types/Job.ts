// src/types/Job.ts

import type { RecordingJob } from "./RecordingJob";
import type { DownloadJob } from "./DownloadJob";
import type { MovieJob } from "./MovieJob";

export type Job = RecordingJob | DownloadJob | MovieJob;
