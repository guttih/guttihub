// src/types/SystemScheduledJob.ts

import { Job } from "@/types/Jobctl";

export interface SystemScheduledJob {
    systemJobId: string;  // systemJobId (e.g., at job id)
    datetime:    string;  // scheduled start time (ISO format)
    description: string;  // e.g., "Recording UK: BBC 1 HD ◉ for 180s [cacheKey]"
    command:     string;  // full shell command that will be run
}

export interface SystemScheduledListJobResponse {
    ok: boolean;
    jobs: SystemScheduledJob[];
}
export interface SystemScheduledGetJobResponse {
    ok: boolean;
    job: SystemScheduledJob;
}

export interface SystemScheduledErrorResponse {
    ok: boolean;
    error: string;
}

export const jobctlToSystemScheduledJobMapper = (job: Job): SystemScheduledJob => {
    return {
      systemJobId: job.id,
      datetime: job.datetime,
      description: job.description,
      command: job.command,
    };
  };

export const systemScheduledJobToJobctlMapper = (job: SystemScheduledJob): Job => {
    return {
      id: job.systemJobId,
      datetime: job.datetime,
      description: job.description,
      command: job.command,
    };
  };


export type SystemScheduledResponse = SystemScheduledGetJobResponse | SystemScheduledListJobResponse | SystemScheduledErrorResponse;