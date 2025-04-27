// src/types/Jobctl.ts

// These types define the structure of jobctl API requests and responses.
// They are specifically used for interacting with the jobctl command-line tool, 
// which manages scheduled jobs at the operating system level.

// For communication between the frontend and backend, use the SystemScheduledJob interface instead.

export interface Job {
    id: string;
    datetime: string; // "2025-05-02 02:15:00"
    description: string;
    command: string;
}

export interface JobctlAddSuccess {
    ok: true;
    job: Job;
}

export interface JobctlGetSuccess {
    ok: true;
    job: Job;
}

export interface JobctlListSuccess {
    ok: true;
    jobs: Job[];
}

export interface JobctlDeleteSuccess {
    ok: true;
    deleted: string[];
}

export interface JobctlError {
    ok: false;
    error: string;
}

export type JobctlResult = JobctlAddSuccess | JobctlListSuccess | JobctlDeleteSuccess | JobctlGetSuccess | JobctlError;
