
export enum StreamFormat {
    MP4 = 'mp4',
    MKV = 'mkv',
    TS = 'ts',
    AVI = 'avi',
    UNKNOWN = 'unknown',
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

  export const getStreamFormat = (url: string | null | undefined): StreamFormat => {
    if (!url || typeof url !== 'string' || url.indexOf('.') < 1) {
      return StreamFormat.UNKNOWN;
    }
  
    const ext = url.slice(url.lastIndexOf('.') + 1).toLowerCase();
  
    // Check if the ext is one of the enum values
    const formats = Object.values(StreamFormat);
    return formats.includes(ext as StreamFormat) ? ext as StreamFormat : StreamFormat.UNKNOWN;
  };
  