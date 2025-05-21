import { describe, it, expect } from 'vitest';
import { RecordingCmdParams } from '@/types/RecordingCmdParams';
import { extractParamMapFromCmd} from '@/utils/extractParamMapFromCmd';

describe('extractParamMapFromCmd', () => {
  it('parses the full recording command into a typed object', () => {
    const cmd = `bash /home/guttih/projects/guttihub/src/scripts/record.sh "--url" "http://m3u.best-smarter.me:80/7d483beb4604/qxha3die9c/162096" "--duration" "180" "--user" "gudjonholm@gmail.com" "--outputFile" "/home/guttih/projects/guttihub/public/videos/recordings/recording-250424T234440-162096.mp4" "--recordingType" "hls" "--format" "mp4"`;

    const result = extractParamMapFromCmd(cmd);

    expect(result).toEqual<RecordingCmdParams>({
      command: 'bash',
      script: '/home/guttih/projects/guttihub/src/scripts/record.sh',
      url: 'http://m3u.best-smarter.me:80/7d483beb4604/qxha3die9c/162096',
      duration: '180',
      user: 'gudjonholm@gmail.com',
      outputFile: '/home/guttih/projects/guttihub/public/videos/recordings/recording-250424T234440-162096.mp4',
      recordingType: 'hls',
      format: 'mp4',
    });
  });

  it('returns undefined for missing optional fields', () => {
    const cmd = `bash /script.sh "--url" "someurl"`;

    const result = extractParamMapFromCmd(cmd);

    expect(result).toEqual<RecordingCmdParams>({
      command: 'bash',
      script: '/script.sh',
      url: 'someurl',
      duration: undefined,
      user: undefined,
      outputFile: undefined,
      recordingType: undefined,
      format: undefined,
    });
  });
});
