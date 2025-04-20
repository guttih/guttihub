// src/types/Jobctl.ts

export interface Job {
    id: string;
    datetime: string;     // "2025-05-02 02:15:00"
    description: string;
    command: string;
  }
  
  export interface JobctlAddSuccess {
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
  
  export type JobctlResult = JobctlAddSuccess | JobctlListSuccess | JobctlDeleteSuccess | JobctlError;
  