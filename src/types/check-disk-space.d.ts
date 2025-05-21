// src/types/check-disk-space.d.ts
declare module 'check-disk-space' {
    interface DiskSpace {
      free: number;
      total: number;
    }
  
    // Declare the default export as a callable function
    export default function checkDiskSpace(directoryPath: string): Promise<DiskSpace>;
  }