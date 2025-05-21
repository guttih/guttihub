import { RecordingCmdParams } from "@/types/RecordingCmdParams";


export function extractParamMapFromCmd(fullCmd: string): RecordingCmdParams {
    
  const parts = fullCmd.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];

  const result: RecordingCmdParams = {
    command: parts[0] ?? '',
    script: parts[1] ?? '',
    url: undefined,
    duration: undefined,
    user: undefined,
    outputFile: undefined,
    recordingType: undefined,
    format: undefined,
  };

  let i = 2;
  while (i < parts.length) {
    const key = parts[i];
    const value = parts[i + 1];

    if (key !== undefined && value !== undefined) {
      const cleanKey = key.replace(/"/g, '').slice(2); // remove quotes and --
      const cleanValue = value.replace(/"/g, ''); // remove quotes

      if ((cleanKey as keyof RecordingCmdParams) in result) {
        (result as Partial<RecordingCmdParams>)[cleanKey as keyof RecordingCmdParams] = cleanValue;
      }
    }

    i += 2;
  }

  return result;
}