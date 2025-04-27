// src/types/SystemScheduledJob.ts

import { Job } from "@/types/Jobctl";
import { M3UEntry } from "./M3UEntry";

// This file defines types and interfaces for system-scheduled jobs,
// facilitating consistent communication between the frontend and backend.

// Jobctl.ts interfaces are used to manage jobs in the operating system and should not be used directly used in the frontend.
// Instead, use the SystemScheduledJob interface to represent jobs in the system scheduler.

export interface SystemScheduledJob {
    systemJobId: string; // systemJobId (e.g., at job id)
    datetime: string; // scheduled start time (ISO format)
    description: string; // e.g., "Recording UK: BBC 1 HD ◉ for 180s [cacheKey]"
    command: string; // full shell command that will be run
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

export type SystemScheduledResponse = SystemScheduledGetJobResponse | SystemScheduledListJobResponse | SystemScheduledErrorResponse;

export interface ScheduledJobEnriched {
    systemJobId: string;
    datetime: string;
    description: string;
    command: string;
    duration: number;
    user: string;
    cacheKey: string;
    outputFile: string;
    recordingType: string;
    format: string;
    entry?: M3UEntry; // optional because it depends on the cacheKey file existing
}

export interface SystemScheduledEnrichedGetJobResponse {
    ok: boolean;
    job: ScheduledJobEnriched;
}

export interface SystemScheduledEnrichedUpdateJobResponse {
    ok: boolean;
    jobEnriched: ScheduledJobEnriched;
}

// export interface SystemScheduledEnrichedUpdateJobResponse extends SystemScheduledEnrichedGetJobResponse {}

export type SystemScheduledEnrichedResponse =
//     | SystemScheduledEnrichedGetJobResponse
     | SystemScheduledEnrichedUpdateJobResponse
//     | SystemScheduledEnrichedErrorResponse;
     | SystemScheduledErrorResponse;
