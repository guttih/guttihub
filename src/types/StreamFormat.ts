
export enum StreamFormat {
    MP4 = 'mp4',
    MKV = 'mkv',
    TS = 'ts',
    AVI = 'avi',
    //M3U8 = 'm3u8',
    // FLV = 'flv',
    // MOV = 'mov',
    // WEBM = 'webm',
  }
  

  // Supported directly by browser or hls.js:
export const supportedFormats: StreamFormat[] = [
    StreamFormat.MP4,
    StreamFormat.MKV,
    // StreamFormat.AVI, // Ttried a few, but no playback
    // StreamFormat.TS, // Ttried a few, but no playback
    // StreamFormat.M3U8 //No wideo with this format was found on servers
    // StreamFormat.WEBM, // No wideo with this format was found on servers
     // StreamFormat.FLV, //No wideo with this format was found on servers
    // StreamFormat.MOV, //No wideo with this format was found on servers
  ];