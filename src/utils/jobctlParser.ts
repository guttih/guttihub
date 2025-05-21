// src/utils/parseJobctlJob.ts

import { Job } from "@/types/Jobctl";
import { JobctlParsedMeta } from "@/types/JobctlParsedMeta";
import { extractParamMapFromCmd } from "@/utils/extractParamMapFromCmd";

export function jobctlParser(job: Job): JobctlParsedMeta {
  const parsedParams = extractParamMapFromCmd(job.command);
  const cacheKeyMatch = job.description.match(/\[([^\]]+)\]/);
  const cacheKey = cacheKeyMatch?.[1] ?? undefined;


  return {
    cacheKey,
    url: parsedParams.url,
    outputFile: parsedParams.outputFile,
    duration: parsedParams?.duration ? parseInt(parsedParams?.duration, 10) : undefined,
    recordingType: parsedParams.recordingType,
    format: parsedParams.format,
    user:  parsedParams.user,
  };
}


