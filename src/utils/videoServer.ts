import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export function resolveSecureFile(basePath: string, fileParts: string[]): string | null {
  const fullPath = path.resolve(basePath, ...fileParts);
  if (!fullPath.startsWith(path.resolve(basePath))) {
    return null; // 🚫 Path traversal
  }
  return fullPath;
}

export function streamFileRange(
  filePath: string,
  range: string | null
): { stream: Readable; status: number; headers: Record<string, string> } {
  const stat = fs.statSync(filePath);

  if (!range) {
    const stream = fs.createReadStream(filePath);
    return {
      stream,
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': stat.size.toString(),
      },
    };
  }

  const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
  const start = parseInt(startStr, 10);
  const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
  const chunkSize = end - start + 1;
  const stream = fs.createReadStream(filePath, { start, end });

  return {
    stream,
    status: 206,
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize.toString(),
    },
  };
}
