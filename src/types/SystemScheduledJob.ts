// src/types/SystemScheduledJob.ts

export interface SystemScheduledJob {
    systemJobId: string;  // systemJobId (e.g., at job id)
    datetime:    string;  // scheduled start time (ISO format)
    description: string;  // e.g., "Recording UK: BBC 1 HD ◉ for 180s [cacheKey]"
    command:     string;  // full shell command that will be run
}
