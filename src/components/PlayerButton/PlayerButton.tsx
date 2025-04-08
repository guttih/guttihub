'use client';

import React from 'react';
import { SupportedFormats } from '@/types/StreamFormat';

interface PlayerButtonProps {
  streamUrl: string;
  className?: string;
}

export default function PlayerButton({ streamUrl, className = '' }: PlayerButtonProps) {
  const extension = streamUrl.split('.').pop()?.toLowerCase();
  const supported = SupportedFormats.map(format => format.toLowerCase());

  if (!extension) {
    return null; // skip if extension missing
  }

  if (supported.includes(extension)) {
    return (
      <form action="/player/submit" method="POST" className={className}>
        <input type="hidden" name="url" value={streamUrl} />
        <button type="submit" className="text-blue-400 text-sm hover:underline" title="Play stream">
          ▶ Play Stream
        </button>
      </form>
    );
  }

  // For unsupported formats, show download link
  return (
    <a
      href={streamUrl}
      download
      className="text-green-400 text-sm hover:underline"
      title={`Download ${extension.toUpperCase()} file`}
    >
      ⬇ Download {extension.toUpperCase()}
    </a>
  );
}
