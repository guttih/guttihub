import { SystemScheduledJob } from "@/types/SystemScheduledJob";
import { Job } from "@/types/Jobctl";

export const jobctlToSystemScheduledJobMapper = (job: Job): SystemScheduledJob => {
    return {
      systemJobId: job.id,
      datetime: job.datetime,
      description: job.description,
      command: job.command,
    };
  };